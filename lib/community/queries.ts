// Community queries: read-side functions that the server components call.
// All read functions are safe to call from RSC. All write functions
// (createThread, createComment, etc.) live in actions.ts because they
// need the request context.

import { getDb } from '@/lib/db';
import type { ThreadCategory, ReactionKind } from './types';

export interface ThreadRow {
  id: string;
  author_id: string;
  category: ThreadCategory;
  title: string;
  body: string;
  created_at: number;
  updated_at: number;
  published_at: number | null;
  last_activity_at: number;
  deleted_at: number | null;
  hidden_at: number | null;
  moderation_status: string;
  comment_count: number;
  reaction_score: number;
  reaction_count: number;
  author_display_name: string | null;
  // Used by the UI to highlight trending threads.
  recent_comment_count: number;
}

export interface CommentRow {
  id: string;
  thread_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: number;
  updated_at: number;
  published_at: number | null;
  deleted_at: number | null;
  hidden_at: number | null;
  moderation_status: string;
  reaction_score: number;
  reaction_count: number;
  depth: number;
  author_display_name: string | null;
}

// One thread + the first page of comments. The comment tree is
// computed in JS from the flat list (cheaper than a recursive CTE at
// our scale and easier to reason about).
export interface ThreadDetail {
  thread: ThreadRow;
  comments: CommentRow[];
}

export function listThreads(opts: {
  category?: ThreadCategory | 'all';
  limit?: number;
  offset?: number;
}): ThreadRow[] {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);
  const category = opts.category ?? 'all';

  const params: (string | number)[] = [];
  let where =
    "WHERE t.published_at IS NOT NULL AND t.deleted_at IS NULL AND t.hidden_at IS NULL AND t.moderation_status NOT IN ('mod_rejected')";
  if (category !== 'all') {
    where += ' AND t.category = ?';
    params.push(category);
  }
  // Order of placeholders in the SQL: recent_comment_count (?), LIMIT (?), OFFSET (?).
  // Bind order must match: sinceMs, then limit, then offset.
  params.push(Date.now() - 24 * 60 * 60 * 1000, limit, offset);

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.*, uc.display_name AS author_display_name,
              (SELECT COUNT(*) FROM community_comments c WHERE c.thread_id = t.id AND c.published_at IS NOT NULL AND c.deleted_at IS NULL AND c.created_at > ?) AS recent_comment_count
       FROM community_threads t
       LEFT JOIN user_community uc ON uc.user_id = t.author_id
       ${where}
       ORDER BY t.last_activity_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params) as ThreadRow[];
  return rows;
}

export function countThreads(opts: { category?: ThreadCategory | 'all' } = {}): number {
  const category = opts.category ?? 'all';
  const db = getDb();
  if (category === 'all') {
    return (
      db
        .prepare(
          "SELECT COUNT(*) as n FROM community_threads WHERE published_at IS NOT NULL AND deleted_at IS NULL AND hidden_at IS NULL AND moderation_status NOT IN ('mod_rejected')"
        )
        .get() as { n: number }
    ).n;
  }
  return (
    db
      .prepare(
        "SELECT COUNT(*) as n FROM community_threads WHERE published_at IS NOT NULL AND deleted_at IS NULL AND hidden_at IS NULL AND moderation_status NOT IN ('mod_rejected') AND category = ?"
      )
      .get(category) as { n: number }
  ).n;
}

export function getThread(threadId: string): ThreadRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT t.*, uc.display_name AS author_display_name,
              (SELECT COUNT(*) FROM community_comments c WHERE c.thread_id = t.id AND c.published_at IS NOT NULL AND c.deleted_at IS NULL AND c.created_at > ?) AS recent_comment_count
       FROM community_threads t
       LEFT JOIN user_community uc ON uc.user_id = t.author_id
       WHERE t.id = ?`
    )
    .get(Date.now() - 24 * 60 * 60 * 1000, threadId) as ThreadRow | undefined;
  return row ?? null;
}

// List comments for one thread. We pull all published, non-deleted,
// non-hidden comments in one shot. The CommentTree component flattens
// the array into a tree by parent_comment_id. We cap at 500 comments
// per thread — past that, pagination kicks in.
export function listComments(threadId: string): CommentRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*, uc.display_name AS author_display_name
       FROM community_comments c
       LEFT JOIN user_community uc ON uc.user_id = c.author_id
       WHERE c.thread_id = ?
         AND c.published_at IS NOT NULL
         AND c.deleted_at IS NULL
         AND c.hidden_at IS NULL
         AND c.moderation_status NOT IN ('mod_rejected')
       ORDER BY c.created_at ASC
       LIMIT 500`
    )
    .all(threadId) as CommentRow[];
  return rows;
}

// Reactions for one user across many targets. Used to render the
// highlighted state on the reaction bar (e.g. "you already upvoted this").
export function getUserReactions(userId: string, targetIds: string[]): Map<string, ReactionKind> {
  const out = new Map<string, ReactionKind>();
  if (targetIds.length === 0) return out;
  const db = getDb();
  const placeholders = targetIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT target_id, kind FROM community_reactions WHERE user_id = ? AND target_id IN (${placeholders})`
    )
    .all(userId, ...targetIds) as { target_id: string; kind: ReactionKind }[];
  for (const r of rows) {
    out.set(r.target_id, r.kind);
  }
  return out;
}

export function getUserDisplayName(userId: string): string | null {
  const row = getDb()
    .prepare('SELECT display_name FROM user_community WHERE user_id = ?')
    .get(userId) as { display_name: string } | undefined;
  return row?.display_name ?? null;
}

// Display name lookup for many users. Used by thread / comment lists.
export function getUserDisplayNames(userIds: string[]): Map<string, string> {
  const out = new Map<string, string>();
  if (userIds.length === 0) return out;
  const db = getDb();
  const placeholders = userIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT user_id, display_name FROM user_community WHERE user_id IN (${placeholders})`)
    .all(...userIds) as { user_id: string; display_name: string }[];
  for (const r of rows) out.set(r.user_id, r.display_name);
  return out;
}

// Used by the @mention autocomplete to suggest display names.
export function searchDisplayNames(prefix: string, limit = 8): { user_id: string; display_name: string }[] {
  const p = prefix.trim();
  if (p.length < 1) return [];
  return getDb()
    .prepare(
      `SELECT user_id, display_name FROM user_community
       WHERE display_name LIKE ? COLLATE NOCASE
       ORDER BY display_name
       LIMIT ?`
    )
    .all(`${p}%`, limit) as { user_id: string; display_name: string }[];
}

// Notification helpers.
export function getUnreadNotificationCount(userId: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as n FROM community_notifications WHERE user_id = ? AND read_at IS NULL')
    .get(userId) as { n: number };
  return row.n;
}

export function getRecentNotifications(userId: string, limit = 20) {
  return getDb()
    .prepare(
      `SELECT n.*, uc.display_name AS actor_display_name
       FROM community_notifications n
       LEFT JOIN user_community uc ON uc.user_id = n.actor_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as {
    id: number;
    user_id: string;
    kind: string;
    source_type: string;
    source_id: string;
    actor_id: string;
    dedupe_key: string;
    created_at: number;
    read_at: number | null;
    actor_display_name: string | null;
  }[];
}

export function markAllNotificationsRead(userId: string): number {
  const res = getDb()
    .prepare('UPDATE community_notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL')
    .run(Date.now(), userId);
  return res.changes;
}
