// T42: ARENA anti-cheat — lenient review queue per task body. We log
// (never auto-ban) when a player's settled-challenge win rate over
// the last 10+ plays exceeds 70%. Mods review; we don't act.

import { getDb } from '../db';

export type AntiCheatRow = {
  id: number;
  user_id: string;
  window_size: number;
  win_rate: number;
  total_won: number;
  total_played: number;
  flagged_at: number;
  reviewed_at: number | null;
  reviewer_user_id: string | null;
  review_note: string | null;
};

const THRESHOLD = 0.70;
const MIN_WINDOW = 10;

function db() {
  return getDb();
}

/**
 * Compute a user's recent win rate and log a review entry if it
 * crosses threshold. Safe to call repeatedly — the table has no
 * uniqueness on (user_id, window_size) but we only re-log if the
 * last flag was >24h ago (so the mod queue doesn't fill with the
 * same user's repeated threshold-crossings).
 */
export function checkAndLogWinRate(args: { userId: string; now?: number }): {
  flagged: boolean;
  win_rate: number;
  total_won: number;
  total_played: number;
} {
  const now = args.now ?? Date.now();
  const row = db()
    .prepare(
      `SELECT
         SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) AS wins,
         COUNT(*) AS total
       FROM challenge_participants
       WHERE user_id = ? AND result != 'pending'`
    )
    .get(args.userId) as { wins: number | null; total: number };
  const total = row.total ?? 0;
  const wins = row.wins ?? 0;
  if (total < MIN_WINDOW) {
    return { flagged: false, win_rate: total > 0 ? wins / total : 0, total_won: wins, total_played: total };
  }
  const winRate = wins / total;
  if (winRate < THRESHOLD) {
    return { flagged: false, win_rate: winRate, total_won: wins, total_played: total };
  }
  // Cooldown: don't re-log within 24h of the last flag for this user.
  const last = db()
    .prepare('SELECT flagged_at FROM anti_cheat_log WHERE user_id = ? ORDER BY flagged_at DESC LIMIT 1')
    .get(args.userId) as { flagged_at: number } | undefined;
  if (last && now - last.flagged_at < 24 * 60 * 60 * 1000) {
    return { flagged: false, win_rate: winRate, total_won: wins, total_played: total };
  }
  db().prepare(
    `INSERT INTO anti_cheat_log (user_id, window_size, win_rate, total_won, total_played, flagged_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(args.userId, total, winRate, wins, total, now);
  return { flagged: true, win_rate: winRate, total_won: wins, total_played: total };
}

export function listUnreviewedFlags(limit = 50): Array<AntiCheatRow & { email: string | null }> {
  return db()
    .prepare(
      `SELECT a.*, u.email FROM anti_cheat_log a
         LEFT JOIN users u ON u.id = a.user_id
        WHERE a.reviewed_at IS NULL
        ORDER BY a.win_rate DESC, a.flagged_at DESC
        LIMIT ?`
    )
    .all(limit) as Array<AntiCheatRow & { email: string | null }>;
}

export function listUserFlags(userId: string, limit = 20): AntiCheatRow[] {
  return db()
    .prepare('SELECT * FROM anti_cheat_log WHERE user_id = ? ORDER BY flagged_at DESC LIMIT ?')
    .all(userId, limit) as AntiCheatRow[];
}

export const ANTI_CHEAT_THRESHOLDS = {
  WIN_RATE: THRESHOLD,
  MIN_WINDOW,
};