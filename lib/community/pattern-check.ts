// Layer 4 pattern-detection cron.
//
// Taha decision §13.2: any user with 3+ open reports against their
// content in the last 30 days gets a 72h auto-suspend. 3 suspensions
// in 90 days → manual review (Dexter is paged via the mod log).
//
// This file is the script. It is invoked by:
//   npm run community:pattern-check
// which in turn is called by a host-level cron entry (see
// docs/ARENA_COMMUNITY_v1_SPEC.md §13 for the crontab line). The
// script is idempotent — running it twice in a row is a no-op for
// already-suspended users (the active-suspension index dedupes).
//
// Exit codes:
//   0 — success (or no work)
//   1 — DB error
//   2 — invocation error (missing DB, etc.)
//
// Output: prints a summary to stdout. The cron can pipe to a logfile
// or syslog; we don't deliver anywhere from inside the script.

import { getDb } from '@/lib/db';
import { recordModAction, SYSTEM_MOD_USER_ID } from './mod';

const DAY_MS = 24 * 60 * 60 * 1000;
const PATTERN_WINDOW_MS = 30 * DAY_MS; // 3+ reports in 30d → 72h suspend
const PATTERN_THRESHOLD = 3;
const PATTERN_SUSPEND_HOURS = 72;
const ESCALATION_WINDOW_MS = 90 * DAY_MS; // 3 suspensions in 90d → manual review
const ESCALATION_THRESHOLD = 3;

interface SuspendedUserRow {
  user_id: string;
  report_count: number;
}

interface EscalationRow {
  user_id: string;
  suspension_count: number;
}

export interface PatternCheckResult {
  scanned_at: number;
  new_suspensions: number;
  new_escalations: number;
  suspended_user_ids: string[];
  escalated_user_ids: string[];
}

export function runPatternCheck(): PatternCheckResult {
  const db = getDb();
  const now = Date.now();
  const patternSince = now - PATTERN_WINDOW_MS;
  const escalationSince = now - ESCALATION_WINDOW_MS;

  // 1. Find users with 3+ open (un-resolved) reports against their
  // content in the last 30 days. We join community_reports to the
  // target rows to get the author_id, then group by author.
  const candidates = db
    .prepare(
      `SELECT t.author_id AS user_id, COUNT(DISTINCT r.id) AS report_count
       FROM community_reports r
       JOIN community_threads t
         ON r.target_type = 'thread' AND r.target_id = t.id
       WHERE r.resolved_at IS NULL
         AND r.created_at >= ?
         AND t.author_id IS NOT NULL
       GROUP BY t.author_id
       HAVING report_count >= ?
       UNION
       SELECT c.author_id AS user_id, COUNT(DISTINCT r.id) AS report_count
       FROM community_reports r
       JOIN community_comments c
         ON r.target_type = 'comment' AND r.target_id = c.id
       WHERE r.resolved_at IS NULL
         AND r.created_at >= ?
         AND c.author_id IS NOT NULL
       GROUP BY c.author_id
       HAVING report_count >= ?`
    )
    .all(patternSince, PATTERN_THRESHOLD, patternSince, PATTERN_THRESHOLD) as SuspendedUserRow[];

  // 2. For each candidate: skip if already actively suspended; else
  //    write a 72h community_user_suspensions row, flip the manual
  //    suspend flag, and write the mod log entry.
  const suspended: string[] = [];
  for (const c of candidates) {
    const userRow = db.prepare('SELECT is_moderator FROM users WHERE id = ?').get(c.user_id) as
      | { is_moderator: number }
      | undefined;
    if (!userRow) continue;
    if (userRow.is_moderator === 1) {
      // Layer 4 does not auto-suspend mods. (They can still be
      // manually suspended via the mod API; this is just the
      // auto-path.) Taha decision §13.2: mods skip auto-pattern
      // detection. The auto-hide on individual reports still
      // applies to mod content (Layer 3 is universal).
      continue;
    }
    const active = db
      .prepare(
        `SELECT id FROM community_user_suspensions
         WHERE user_id = ? AND lifted_at IS NULL AND suspended_until > ?`
      )
      .get(c.user_id, now) as { id: number } | undefined;
    if (active) continue;

    const suspendedUntil = now + PATTERN_SUSPEND_HOURS * 60 * 60 * 1000;
    db.prepare(
      `INSERT INTO community_user_suspensions
       (user_id, reason, suspended_at, suspended_until)
       VALUES (?, 'pattern_3_reports_30d', ?, ?)`
    ).run(c.user_id, now, suspendedUntil);
    // The pattern-detection path also sets is_suspended_manually so
    // the same short-circuit the manual-suspend path uses fires on
    // the next write attempt.
    db.prepare('UPDATE users SET is_suspended_manually = 1 WHERE id = ?').run(c.user_id);

    recordModAction({
      modUserId: SYSTEM_MOD_USER_ID,
      action: 'pattern_3_30d',
      targetType: 'user',
      targetId: c.user_id,
      context: {
        report_count_30d: c.report_count,
        suspended_until: suspendedUntil,
        window_days: 30,
      },
    });
    suspended.push(c.user_id);
  }

  // 3. Find users with 3+ suspensions (any reason, lifted or not) in
  //    the last 90 days. Each one is escalated to manual review via
  //    a mod-log row that sits unresolved until a human acts.
  const escalations = db
    .prepare(
      `SELECT user_id, COUNT(*) AS suspension_count
       FROM community_user_suspensions
       WHERE suspended_at >= ?
       GROUP BY user_id
       HAVING suspension_count >= ?`
    )
    .all(escalationSince, ESCALATION_THRESHOLD) as EscalationRow[];

  const escalated: string[] = [];
  for (const e of escalations) {
    // De-dup: don't re-log the same escalation in the same 24h
    // window. (A mod's resolution will reset the count; absent a
    // resolution, we still want the next cron to be idempotent.)
    const recentLog = db
      .prepare(
        `SELECT id FROM community_mod_log
         WHERE action = 'escalation_3_90d'
           AND target_type = 'user'
           AND target_id = ?
           AND created_at > ?`
      )
      .get(e.user_id, now - DAY_MS) as { id: number } | undefined;
    if (recentLog) continue;

    recordModAction({
      modUserId: SYSTEM_MOD_USER_ID,
      action: 'escalation_3_90d',
      targetType: 'user',
      targetId: e.user_id,
      context: {
        suspension_count_90d: e.suspension_count,
        window_days: 90,
        note: '3+ suspensions in 90 days — manual review required (Dexter is paged).',
      },
    });
    escalated.push(e.user_id);
  }

  return {
    scanned_at: now,
    new_suspensions: suspended.length,
    new_escalations: escalated.length,
    suspended_user_ids: suspended,
    escalated_user_ids: escalated,
  };
}

// CLI entry. tsx runs this as the main module.
if (require.main === module) {
  try {
    const result = runPatternCheck();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('community:pattern-check failed:', (e as Error).message);
    process.exit(1);
  }
}
