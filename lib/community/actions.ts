// Server actions for the community block. All write paths go through
// here. Every action:
//   1. Verifies the user is logged in (server-side, not just client).
//   2. Checks rate limits.
//   3. Checks the author is not currently suspended.
//   4. Runs the moderation scan.
//   5. Persists the row + the queue row (if any) atomically.
//   6. Resolves @mentions and writes mention + notification rows.
//
// Returns a discriminated union so the client can render either a
// success state or a moderation-pending state with the right message.

'use server';

import { revalidatePath } from 'next/cache';
import { getDb, uuid } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { scanContent, queueContextFor, type ModerationDecision } from '@/lib/moderation';
import { isModerator, recordModAction } from './mod';
import { resolveMentions } from './mentions';
import { takeRateLimit } from './rate-limit';
import {
  isValidCategory,
  isValidReportReason,
  MAX_COMMENT_BODY,
  MAX_THREAD_BODY,
  MAX_THREAD_TITLE,
  REACTION_KINDS,
  REPORT_NOTE_MAX,
  type ReactionKind,
  type ReportReason,
  type ThreadCategory,
} from './types';

const NEW_USER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SUSPENSION_DEFAULT_MS = 72 * 60 * 60 * 1000;
/**
 * Taha decision §13.7: a target (thread or comment) auto-hides the
 * moment 5 *distinct* users report it with reason='off_topic'. The
 * check runs in-transaction with the report insert; no cron needed
 * for the hot path. Re-reporting as off-topic by the same user does
 * not double-count.
 */
const OFF_TOPIC_AUTO_HIDE_THRESHOLD = 5;

export type ActionResult =
  | { ok: true; threadId?: string; commentId?: string; status: 'published' | 'pending'; userMessage: string }
  | { ok: false; error: string; code: 'auth' | 'rate_limit' | 'suspended' | 'validation' | 'server'; retryAfterMs?: number };

// ----- helpers ---------------------------------------------------------

function fail(error: string, code: ActionFailCode, retryAfterMs?: number): ActionResult {
  return { ok: false, error, code, retryAfterMs };
}

type ActionFailCode = 'auth' | 'rate_limit' | 'suspended' | 'validation' | 'server';

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

function isUserInCooldown(userCreatedAt: number): boolean {
  return Date.now() - userCreatedAt < NEW_USER_COOLDOWN_MS;
}

function isUserSuspended(userId: string): { suspended: boolean; until?: number } {
  const row = getDb()
    .prepare(
      `SELECT suspended_until FROM community_user_suspensions
       WHERE user_id = ? AND lifted_at IS NULL AND suspended_until > ?
       ORDER BY suspended_at DESC LIMIT 1`
    )
    .get(userId, Date.now()) as { suspended_until: number } | undefined;
  if (row) return { suspended: true, until: row.suspended_until };
  return { suspended: false };
}

function ensureUserCommunityRow(userId: string, email: string): void {
  // Display name: derive from email local part on first sight, but
  // the user picks their own at signup. For now, derive a placeholder.
  // (Spec §11 says "First name + last initial" — we approximate with
  // the email local part until a real onboarding step exists.)
  const existing = getDb()
    .prepare('SELECT user_id FROM user_community WHERE user_id = ?')
    .get(userId);
  if (existing) return;
  const placeholder = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 30) || `user-${userId.slice(0, 6)}`;
  getDb()
    .prepare('INSERT INTO user_community (user_id, display_name) VALUES (?, ?)')
    .run(userId, placeholder);
}

function recordModerationQueue(opts: {
  targetType: 'thread' | 'comment';
  targetId: string;
  decision: ModerationDecision;
  priority: number;
  contextJson: string;
}): void {
  const reason =
    opts.decision === 'hold_keyword' || opts.decision === 'hold_keyword_and_toxicity' || opts.decision === 'hold_scored_keyword_only'
      ? 'flagged_keyword'
      : opts.decision === 'hold_toxicity'
      ? 'flagged_toxicity'
      : opts.decision === 'hold_cooldown'
      ? 'cooldown'
      : 'flagged_keyword';
  getDb()
    .prepare(
      `INSERT INTO community_moderation_queue
       (target_type, target_id, queue_reason, context_json, created_at, priority)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(opts.targetType, opts.targetId, reason, opts.contextJson, Date.now(), opts.priority);
}

function recordMentionsAndNotify(opts: {
  sourceType: 'thread' | 'comment';
  sourceId: string;
  body: string;
  authorId: string;
}): void {
  const matches = resolveMentions(opts.body).filter((m) => m.userId !== opts.authorId);
  if (matches.length === 0) return;
  for (const m of matches) {
    try {
      getDb()
        .prepare(
          `INSERT OR IGNORE INTO community_mentions (source_type, source_id, mentioned_id, raw_token, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(opts.sourceType, opts.sourceId, m.userId, m.raw, Date.now());
    } catch {
      // UNIQUE collision — same source already mentioned this user. Skip.
    }
    const dedupeKey = `mention:${opts.sourceType}:${opts.sourceId}:${m.userId}`;
    try {
      getDb()
        .prepare(
          `INSERT OR IGNORE INTO community_notifications
           (user_id, kind, source_type, source_id, actor_id, dedupe_key, created_at)
           VALUES (?, 'mention', ?, ?, ?, ?, ?)`
        )
        .run(m.userId, opts.sourceType, opts.sourceId, opts.authorId, dedupeKey, Date.now());
    } catch {
      // dedupe collision — same notification already exists. Skip.
    }
  }
}

function recordReplyNotification(opts: {
  recipientId: string;
  sourceType: 'thread' | 'comment';
  sourceId: string;
  authorId: string;
}): void {
  if (opts.recipientId === opts.authorId) return;
  const dedupeKey = `reply:${opts.sourceType}:${opts.sourceId}:${opts.authorId}`;
  try {
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO community_notifications
         (user_id, kind, source_type, source_id, actor_id, dedupe_key, created_at)
         VALUES (?, 'reply', ?, ?, ?, ?, ?)`
      )
      .run(opts.recipientId, opts.sourceType, opts.sourceId, opts.authorId, dedupeKey, Date.now());
  } catch {
    // ignore
  }
}

// ----- create thread ---------------------------------------------------

export async function createThreadAction(input: {
  title: string;
  body: string;
  category: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return fail('You need to be logged in to post.', 'auth');

  // Rate limit
  const rl = takeRateLimit('thread', user.id);
  if (!rl.allowed) {
    return fail(
      `You're posting too fast. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
      'rate_limit',
      rl.retryAfterMs
    );
  }

  // Suspension
  const sus = isUserSuspended(user.id);
  if (sus.suspended) {
    return fail('Your account is currently suspended. You can read existing discussions but new posts are paused.', 'suspended');
  }

  // Validation
  const title = (input.title || '').trim();
  const body = (input.body || '').trim();
  const category = input.category;
  if (!title || title.length < 4) return fail('Title is too short (min 4 chars).', 'validation');
  if (title.length > MAX_THREAD_TITLE) return fail(`Title is too long (max ${MAX_THREAD_TITLE} chars).`, 'validation');
  if (!body) return fail('Body is required.', 'validation');
  if (body.length > MAX_THREAD_BODY) return fail(`Body is too long (max ${MAX_THREAD_BODY} chars).`, 'validation');
  if (!isValidCategory(category)) return fail('Pick a valid category.', 'validation');

  // Ensure the author has a user_community row (display name lookup).
  ensureUserCommunityRow(user.id, user.email);

  // Moderation scan
  const outcome = await scanContent({
    text: `${title}\n\n${body}`,
    authorCreatedAt: user.created_at,
    isSuspended: false,
    isModerator: isModerator(user.id),
  });

  const id = uuid();
  const now = Date.now();
  const published = outcome.decision === 'publish' ? now : null;
  const moderationStatus =
    outcome.decision === 'publish'
      ? 'clean'
      : outcome.decision === 'hold_scored_keyword_only'
      ? 'scored_only_keyword'
      : outcome.decision === 'hold_cooldown'
      ? 'cooldown'
      : outcome.decision === 'hold_keyword_and_toxicity'
      ? 'flagged_keyword' // we'll track toxicity in queue.context
      : outcome.decision;

  try {
    getDb()
      .prepare(
        `INSERT INTO community_threads
         (id, author_id, category, title, body, created_at, updated_at, published_at, last_activity_at, moderation_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, user.id, category, title, body, now, now, published, now, moderationStatus);
  } catch (e) {
    return fail('Failed to create thread. Please try again.', 'server');
  }

  // Bump the user's thread counter.
  getDb()
    .prepare('UPDATE user_community SET thread_count = thread_count + 1 WHERE user_id = ?')
    .run(user.id);

  if (outcome.decision !== 'publish') {
    recordModerationQueue({
      targetType: 'thread',
      targetId: id,
      decision: outcome.decision,
      priority: outcome.priority,
      contextJson: queueContextFor(outcome),
    });
  } else {
    // Only record mentions on publish — the notification fires only when
    // the content goes live. Pre-publish, the user is in the queue and
    // can edit; we don't want a half-formed @-mention notification.
    recordMentionsAndNotify({ sourceType: 'thread', sourceId: id, body: `${title}\n\n${body}`, authorId: user.id });
  }

  revalidatePath('/community');
  return {
    ok: true,
    threadId: id,
    status: outcome.decision === 'publish' ? 'published' : 'pending',
    userMessage: outcome.userMessage,
  };
}

// ----- create comment --------------------------------------------------

export async function createCommentAction(input: {
  threadId: string;
  parentCommentId: string | null;
  body: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return fail('You need to be logged in to comment.', 'auth');

  const rl = takeRateLimit('comment', user.id);
  if (!rl.allowed) {
    return fail(
      `You're commenting too fast. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
      'rate_limit',
      rl.retryAfterMs
    );
  }

  const sus = isUserSuspended(user.id);
  if (sus.suspended) {
    return fail('Your account is currently suspended. You can read existing discussions but new posts are paused.', 'suspended');
  }

  const body = (input.body || '').trim();
  if (!body) return fail('Comment is empty.', 'validation');
  if (body.length > MAX_COMMENT_BODY) return fail(`Comment is too long (max ${MAX_COMMENT_BODY} chars).`, 'validation');

  const thread = getDb()
    .prepare('SELECT id, author_id, published_at, deleted_at, hidden_at FROM community_threads WHERE id = ?')
    .get(input.threadId) as { id: string; author_id: string; published_at: number | null; deleted_at: number | null; hidden_at: number | null } | undefined;
  if (!thread) return fail('Thread not found.', 'validation');
  if (!thread.published_at || thread.deleted_at || thread.hidden_at) {
    return fail('This thread is not accepting comments.', 'validation');
  }

  let depth = 0;
  if (input.parentCommentId) {
    const parent = getDb()
      .prepare('SELECT depth FROM community_comments WHERE id = ? AND thread_id = ?')
      .get(input.parentCommentId, input.threadId) as { depth: number } | undefined;
    if (!parent) return fail('Parent comment not found.', 'validation');
    depth = parent.depth + 1;
    if (depth > 6) {
      // We allow storing deep but the UI caps render at 3. Soft cap to
      // prevent pathological chains.
      return fail('Reply chain is too deep. Please reply to a higher-level comment.', 'validation');
    }
  }

  ensureUserCommunityRow(user.id, user.email);

  const outcome = await scanContent({
    text: body,
    authorCreatedAt: user.created_at,
    isSuspended: false,
    isModerator: isModerator(user.id),
  });

  const id = uuid();
  const now = Date.now();
  const published = outcome.decision === 'publish' ? now : null;
  const moderationStatus =
    outcome.decision === 'publish'
      ? 'clean'
      : outcome.decision === 'hold_scored_keyword_only'
      ? 'scored_only_keyword'
      : outcome.decision === 'hold_cooldown'
      ? 'cooldown'
      : outcome.decision === 'hold_keyword_and_toxicity'
      ? 'flagged_keyword'
      : outcome.decision;

  try {
    getDb()
      .prepare(
        `INSERT INTO community_comments
         (id, thread_id, author_id, parent_comment_id, body, created_at, updated_at, published_at, moderation_status, depth)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, input.threadId, user.id, input.parentCommentId, body, now, now, published, moderationStatus, depth);
  } catch {
    return fail('Failed to create comment. Please try again.', 'server');
  }

  // Bump counters.
  getDb()
    .prepare('UPDATE user_community SET comment_count = comment_count + 1 WHERE user_id = ?')
    .run(user.id);
  if (published) {
    getDb()
      .prepare('UPDATE community_threads SET comment_count = comment_count + 1, last_activity_at = ? WHERE id = ?')
      .run(now, input.threadId);
  }

  if (outcome.decision !== 'publish') {
    recordModerationQueue({
      targetType: 'comment',
      targetId: id,
      decision: outcome.decision,
      priority: outcome.priority,
      contextJson: queueContextFor(outcome),
    });
  } else {
    recordMentionsAndNotify({ sourceType: 'comment', sourceId: id, body, authorId: user.id });
    // Reply notification: thread author always, plus parent comment
    // author if it's a nested reply.
    recordReplyNotification({ recipientId: thread.author_id, sourceType: 'thread', sourceId: input.threadId, authorId: user.id });
    if (input.parentCommentId) {
      const parent = getDb()
        .prepare('SELECT author_id FROM community_comments WHERE id = ?')
        .get(input.parentCommentId) as { author_id: string } | undefined;
      if (parent) {
        recordReplyNotification({ recipientId: parent.author_id, sourceType: 'comment', sourceId: input.parentCommentId, authorId: user.id });
      }
    }
  }

  revalidatePath(`/community/${input.threadId}`);
  revalidatePath('/community');
  return {
    ok: true,
    commentId: id,
    status: outcome.decision === 'publish' ? 'published' : 'pending',
    userMessage: outcome.userMessage,
  };
}

// ----- toggle reaction -------------------------------------------------

export async function toggleReactionAction(input: {
  targetType: 'thread' | 'comment';
  targetId: string;
  kind: ReactionKind;
}): Promise<{ ok: true; state: 'on' | 'off'; score: number; count: number } | { ok: false; error: string; code: 'auth' | 'validation' | 'server' }> {
  const user = await requireUser();
  if (!user) return { ok: false, error: 'You need to be logged in to react.', code: 'auth' };
  if (!REACTION_KINDS.includes(input.kind)) return { ok: false, error: 'Invalid reaction kind.', code: 'validation' };

  const rl = takeRateLimit('reaction', user.id);
  if (!rl.allowed) return { ok: false, error: 'You are reacting too fast. Slow down.', code: 'server' };

  // If the user already has a reaction of this kind, toggling removes
  // it. If they have a different kind, the unique constraint blocks the
  // insert — we delete the old one and insert the new one.
  const db = getDb();
  const existing = db
    .prepare('SELECT kind FROM community_reactions WHERE user_id = ? AND target_type = ? AND target_id = ?')
    .get(user.id, input.targetType, input.targetId) as { kind: ReactionKind } | undefined;

  if (existing && existing.kind === input.kind) {
    // Toggle off.
    db.prepare('DELETE FROM community_reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND kind = ?').run(
      user.id,
      input.targetType,
      input.targetId,
      input.kind
    );
  } else if (existing) {
    // Switch: delete old, insert new.
    db.prepare('DELETE FROM community_reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND kind = ?').run(
      user.id,
      input.targetType,
      input.targetId,
      existing.kind
    );
    db.prepare('INSERT INTO community_reactions (user_id, target_type, target_id, kind, created_at) VALUES (?, ?, ?, ?, ?)').run(
      user.id,
      input.targetType,
      input.targetId,
      input.kind,
      Date.now()
    );
    // Notification: kind-switch on someone else's content still counts.
    maybeRecordReactionNotification(input.targetType, input.targetId, user.id);
  } else {
    // Fresh insert.
    db.prepare('INSERT INTO community_reactions (user_id, target_type, target_id, kind, created_at) VALUES (?, ?, ?, ?, ?)').run(
      user.id,
      input.targetType,
      input.targetId,
      input.kind,
      Date.now()
    );
    maybeRecordReactionNotification(input.targetType, input.targetId, user.id);
  }

  // Recompute the target's score + count.
  const totals = db
    .prepare(
      `SELECT
         SUM(CASE WHEN kind = 'upvote' THEN 1 WHEN kind = 'downvote' THEN -1 ELSE 0 END) AS score,
         COUNT(*) AS n
       FROM community_reactions WHERE target_type = ? AND target_id = ?`
    )
    .get(input.targetType, input.targetId) as { score: number | null; n: number };

  const score = totals.score ?? 0;
  const count = totals.n ?? 0;

  // Update the denormalized counters on the target row.
  const table = input.targetType === 'thread' ? 'community_threads' : 'community_comments';
  db.prepare(`UPDATE ${table} SET reaction_score = ?, reaction_count = ? WHERE id = ?`).run(score, count, input.targetId);

  revalidatePath(input.targetType === 'thread' ? `/community/${input.targetId}` : `/community`);
  return { ok: true, state: existing && existing.kind === input.kind ? 'off' : 'on', score, count };
}

function maybeRecordReactionNotification(targetType: 'thread' | 'comment', targetId: string, actorId: string): void {
  const table = targetType === 'thread' ? 'community_threads' : 'community_comments';
  const row = getDb()
    .prepare(`SELECT author_id FROM ${table} WHERE id = ?`)
    .get(targetId) as { author_id: string } | undefined;
  if (!row || row.author_id === actorId) return;
  // Dedupe per hour bucket so a 💡 storm becomes one notification.
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const dedupeKey = `reaction:${targetType}:${targetId}:${actorId}:${hourBucket}`;
  try {
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO community_notifications
         (user_id, kind, source_type, source_id, actor_id, dedupe_key, created_at)
         VALUES (?, 'reaction', ?, ?, ?, ?, ?)`
      )
      .run(row.author_id, targetType, targetId, actorId, dedupeKey, Date.now());
  } catch {
    // ignore
  }
}

// ----- report ----------------------------------------------------------

export async function reportAction(input: {
  targetType: 'thread' | 'comment';
  targetId: string;
  reason: string;
  note?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return fail('You need to be logged in to report.', 'auth');

  const rl = takeRateLimit('report', user.id);
  if (!rl.allowed) {
    return fail(
      `You've used your report quota. Try again in ${Math.ceil(rl.retryAfterMs / 60000)}m.`,
      'rate_limit',
      rl.retryAfterMs
    );
  }

  if (!isValidReportReason(input.reason)) return fail('Pick a valid reason.', 'validation');
  const note = (input.note || '').trim();
  if (note.length > REPORT_NOTE_MAX) return fail(`Note is too long (max ${REPORT_NOTE_MAX} chars).`, 'validation');

  const table = input.targetType === 'thread' ? 'community_threads' : 'community_comments';
  const target = getDb()
    .prepare(`SELECT id, author_id, hidden_at FROM ${table} WHERE id = ?`)
    .get(input.targetId) as { id: string; author_id: string; hidden_at: number | null } | undefined;
  if (!target) return fail('Target not found.', 'validation');
  if (target.author_id === user.id) return fail("You can't report your own content.", 'validation');

  const db = getDb();
  // Count distinct open reports on this target. The "open" predicate
  // matches the report that triggered the first auto-hide — once a
  // report is resolved by a mod, it's no longer "open" for the
  // auto-hide cascade. (We don't currently resolve reports in v1, but
  // future-mod work could; this stays correct.)
  const distinctReporters = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT reporter_id) as n
         FROM community_reports
         WHERE target_type = ? AND target_id = ? AND resolved_at IS NULL`
      )
      .get(input.targetType, input.targetId) as { n: number }
  ).n;

  let triggeredHide = 0;
  if (distinctReporters === 0) {
    // First report on this target from any user: auto-hide (Layer 3 default).
    db.prepare(`UPDATE ${table} SET hidden_at = ? WHERE id = ?`).run(Date.now(), input.targetId);
    triggeredHide = 1;
  }

  try {
    db.prepare(
      `INSERT INTO community_reports (reporter_id, target_type, target_id, reason, note, created_at, triggered_hide)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .run(user.id, input.targetType, input.targetId, input.reason, note || null, Date.now(), triggeredHide);
  } catch {
    return fail('Failed to submit report.', 'server');
  }

  // Enqueue the mod queue row for this report. Off-topic reports are
  // also enqueued so the mod can audit; the auto-hide path is a
  // separate check (below).
  db.prepare(
    `INSERT INTO community_moderation_queue (target_type, target_id, queue_reason, context_json, created_at, priority)
     VALUES (?, ?, 'report', ?, ?, ?)`
  ).run(input.targetType, input.targetId, JSON.stringify({ reason: input.reason, note }), Date.now(), 60);

  // ----------------------------------------------------------------
  // Taha decision §13.7: off-topic auto-hide.
  //
  // If the report reason is off_topic, count distinct reporters with
  // reason='off_topic' on this target. If the count hits 5, set
  // hidden_at and write a system mod-log row so the auto-hide is
  // auditable. One user reporting 5 times = 1 distinct reporter, so
  // it does NOT trigger the auto-hide. (Taha's explicit test case.)
  // ----------------------------------------------------------------
  let autoHidden = false;
  if (input.reason === 'off_topic') {
    const distinctOffTopicReporters = (
      db
        .prepare(
          `SELECT COUNT(DISTINCT reporter_id) as n
           FROM community_reports
           WHERE target_type = ? AND target_id = ? AND reason = 'off_topic' AND resolved_at IS NULL`
        )
        .get(input.targetType, input.targetId) as { n: number }
    ).n;

    if (distinctOffTopicReporters >= OFF_TOPIC_AUTO_HIDE_THRESHOLD) {
      // Idempotent: only set hidden_at if it's still null (don't
      // double-set if a 6th report lands after the auto-hide).
      if (!target.hidden_at) {
        db.prepare(`UPDATE ${table} SET hidden_at = ? WHERE id = ?`).run(Date.now(), input.targetId);
      }
      autoHidden = true;
      // Audit the auto-hide in community_mod_log so the T39 mod UI
      // can surface "hidden by community, N off-topic reports" rows.
      recordModAction({
        modUserId: 'system',
        action: 'post_auto_hidden_off_topic',
        targetType: input.targetType,
        targetId: input.targetId,
        context: {
          reason: 'auto_hidden_off_topic',
          distinct_off_topic_reporters: distinctOffTopicReporters,
          threshold: OFF_TOPIC_AUTO_HIDE_THRESHOLD,
        },
      });
    }
  }

  return {
    ok: true,
    status: 'published',
    userMessage: autoHidden
      ? 'Thanks — the post is now hidden (5 off-topic reports). A moderator can review.'
      : 'Thanks — a moderator will look at it.',
  };
}

// ----- edit (within 15-min window) -------------------------------------

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export async function editCommentAction(input: {
  commentId: string;
  body: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return fail('You need to be logged in.', 'auth');
  const db = getDb();
  const c = db
    .prepare('SELECT id, author_id, body, created_at, published_at FROM community_comments WHERE id = ?')
    .get(input.commentId) as { id: string; author_id: string; body: string; created_at: number; published_at: number | null } | undefined;
  if (!c) return fail('Comment not found.', 'validation');
  if (c.author_id !== user.id) return fail("You can only edit your own comments.", 'auth');
  const age = Date.now() - c.created_at;
  if (age > EDIT_WINDOW_MS) {
    return fail('The 15-minute edit window has closed. Your edit will go through moderator review.', 'validation');
  }
  const body = (input.body || '').trim();
  if (!body) return fail('Comment is empty.', 'validation');
  if (body.length > MAX_COMMENT_BODY) return fail(`Comment is too long (max ${MAX_COMMENT_BODY} chars).`, 'validation');

  const outcome = await scanContent({
    text: body,
    authorCreatedAt: user.created_at,
    isSuspended: false,
    isModerator: isModerator(user.id),
  });

  if (outcome.decision !== 'publish') {
    // Hold for review — re-queue the comment, but don't lose the
    // existing published row. We mark it pending again.
    db.prepare(
      `UPDATE community_comments SET body = ?, updated_at = ?, published_at = NULL, moderation_status = ?, edit_count = edit_count + 1 WHERE id = ?`
    ).run(body, Date.now(), outcome.decision === 'hold_cooldown' ? 'cooldown' : outcome.decision, input.commentId);
    recordModerationQueue({
      targetType: 'comment',
      targetId: c.id,
      decision: outcome.decision,
      priority: outcome.priority,
      contextJson: queueContextFor(outcome),
    });
    return { ok: true, commentId: c.id, status: 'pending', userMessage: 'Your edit is under review.' };
  }

  db.prepare('UPDATE community_comments SET body = ?, updated_at = ?, edit_count = edit_count + 1 WHERE id = ?').run(
    body,
    Date.now(),
    c.id
  );
  revalidatePath(`/community`);
  return { ok: true, commentId: c.id, status: 'published', userMessage: 'Edited.' };
}

// ----- soft delete -----------------------------------------------------

export async function deleteOwnThreadAction(threadId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return fail('You need to be logged in.', 'auth');
  const t = getDb()
    .prepare('SELECT author_id, created_at FROM community_threads WHERE id = ?')
    .get(threadId) as { author_id: string; created_at: number } | undefined;
  if (!t) return fail('Thread not found.', 'validation');
  if (t.author_id !== user.id) return fail('You can only delete your own threads.', 'auth');
  getDb()
    .prepare('UPDATE community_threads SET deleted_at = ? WHERE id = ?')
    .run(Date.now(), threadId);
  revalidatePath('/community');
  return { ok: true, status: 'published', userMessage: 'Thread removed.' };
}

export async function deleteOwnCommentAction(commentId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return fail('You need to be logged in.', 'auth');
  const c = getDb()
    .prepare('SELECT author_id FROM community_comments WHERE id = ?')
    .get(commentId) as { author_id: string } | undefined;
  if (!c) return fail('Comment not found.', 'validation');
  if (c.author_id !== user.id) return fail('You can only delete your own comments.', 'auth');
  getDb()
    .prepare('UPDATE community_comments SET deleted_at = ? WHERE id = ?')
    .run(Date.now(), commentId);
  return { ok: true, status: 'published', userMessage: 'Comment removed.' };
}

// ----- mark notifications read -----------------------------------------

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return fail('You need to be logged in.', 'auth');
  const { markAllNotificationsRead } = await import('./queries');
  markAllNotificationsRead(user.id);
  return { ok: true, status: 'published', userMessage: 'Notifications marked read.' };
}

// ----- mod (out of v1 UI scope, but the data layer is here) ------------

export async function resolveModerationItemAction(input: {
  queueItemId: number;
  resolution: 'approved' | 'rejected' | 'escalated';
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return fail('You need to be logged in.', 'auth');
  if (!isModerator(user.id)) return fail('Moderator role required.', 'auth');

  const db = getDb();
  const item = db
    .prepare('SELECT id, target_type, target_id, queue_reason, context_json FROM community_moderation_queue WHERE id = ?')
    .get(input.queueItemId) as { id: number; target_type: string; target_id: string; queue_reason: string; context_json: string } | undefined;
  if (!item) return fail('Queue item not found.', 'validation');

  const now = Date.now();
  db.prepare(
    `UPDATE community_moderation_queue SET resolved_at = ?, resolved_by = ?, resolution = ? WHERE id = ?`
  ).run(now, user.id, input.resolution, item.id);

  if (input.resolution === 'approved') {
    const table = item.target_type === 'thread' ? 'community_threads' : 'community_comments';
    db.prepare(`UPDATE ${table} SET published_at = ?, moderation_status = 'mod_approved' WHERE id = ?`).run(now, item.target_id);
  } else if (input.resolution === 'rejected') {
    const table = item.target_type === 'thread' ? 'community_threads' : 'community_comments';
    db.prepare(`UPDATE ${table} SET moderation_status = 'mod_rejected' WHERE id = ?`).run(item.target_id);
  }

  // Audit (Taha decision §13.3a). Every mod action writes a row.
  recordModAction({
    modUserId: user.id,
    action: input.resolution === 'approved' ? 'queue_approved' : input.resolution === 'rejected' ? 'queue_rejected' : 'queue_escalated',
    targetType: 'queue_item',
    targetId: String(item.id),
    context: {
      target_type: item.target_type,
      target_id: item.target_id,
      queue_reason: item.queue_reason,
    },
  });

  return { ok: true, status: 'published', userMessage: 'Resolved.' };
}
