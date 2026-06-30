// T42: ARENA leaderboards — read-only views over the credit ledger
// and clan roll-ups. Backed entirely by SQL aggregates so reads stay
// fast even with many participants.
//
// Four boards per task body:
//   1. Weekly (top 100 players by credits earned this ISO week)
//   2. All-time (top 100 players by total credits earned)
//   3. Per-clan (top 50 clans by member performance)
//   4. Per-category (top 50 players per challenge kind)

import { getDb } from '../db';
import { CATALOG_ORDER, type ChallengeKind } from './catalog';

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  email: string | null;
  display_name: string | null;
  metric_value: number;
};

export type ClanLeaderboardRow = {
  rank: number;
  clan_id: string;
  clan_name: string;
  member_count: number;
  total_credits_won: number;
  weekly_credits_won: number;
};

function db() {
  return getDb();
}

function nowMs() {
  return Date.now();
}

/** Top 100 players by credits earned this ISO week. */
export function weeklyLeaderboard(limit = 100): LeaderboardRow[] {
  const rows = db()
    .prepare(
      `SELECT u.id AS user_id, u.email,
              COALESCE(uc.display_name, u.email) AS display_name,
              COALESCE(SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END), 0) AS metric_value
         FROM users u
         LEFT JOIN user_community uc ON uc.user_id = u.id
         LEFT JOIN credit_transactions ct ON ct.user_id = u.id
           AND strftime('%Y-%W', ct.created_at / 1000, 'unixepoch') = strftime('%Y-%W', 'now')
        GROUP BY u.id
       HAVING metric_value > 0
        ORDER BY metric_value DESC
        LIMIT ?`
    )
    .all(limit) as Omit<LeaderboardRow, 'rank'>[];
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Top 100 players by lifetime challenge payouts. */
export function allTimeLeaderboard(limit = 100): LeaderboardRow[] {
  const rows = db()
    .prepare(
      `SELECT u.id AS user_id, u.email,
              uc.display_name,
              COALESCE(SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END), 0) AS metric_value
         FROM users u
         LEFT JOIN user_community uc ON uc.user_id = u.id
         LEFT JOIN credit_transactions ct ON ct.user_id = u.id
        GROUP BY u.id
       HAVING metric_value > 0
        ORDER BY metric_value DESC
        LIMIT ?`
    )
    .all(limit) as Omit<LeaderboardRow, 'rank'>[];
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Top 50 clans by weekly credits won. */
export function clanWeeklyLeaderboard(limit = 50): ClanLeaderboardRow[] {
  const rows = db()
    .prepare(
      `SELECT id AS clan_id, name AS clan_name, member_count,
              weekly_credits_won, total_credits_won
         FROM clans
        ORDER BY weekly_credits_won DESC, total_credits_won DESC
        LIMIT ?`
    )
    .all(limit) as Omit<ClanLeaderboardRow, 'rank'>[];
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Top 50 clans by all-time credits won. */
export function clanAllTimeLeaderboard(limit = 50): ClanLeaderboardRow[] {
  const rows = db()
    .prepare(
      `SELECT id AS clan_id, name AS clan_name, member_count,
              weekly_credits_won, total_credits_won
         FROM clans
        ORDER BY total_credits_won DESC, weekly_credits_won DESC
        LIMIT ?`
    )
    .all(limit) as Omit<ClanLeaderboardRow, 'rank'>[];
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Per-category leaderboard: top 50 players by lifetime earnings on
 * the given challenge kind. Filtered to payouts from that kind's
 * challenges only.
 */
export function perCategoryLeaderboard(args: { kind: ChallengeKind; limit?: number }): LeaderboardRow[] {
  const limit = args.limit ?? 50;
  const rows = db()
    .prepare(
      `SELECT u.id AS user_id, u.email, uc.display_name,
              COALESCE(SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END), 0) AS metric_value
         FROM users u
         LEFT JOIN user_community uc ON uc.user_id = u.id
         LEFT JOIN credit_transactions ct ON ct.user_id = u.id
         LEFT JOIN challenges c ON c.id = ct.reference_id AND ct.kind = 'challenge_payout'
        WHERE c.kind = ? OR c.kind IS NULL
        GROUP BY u.id
       HAVING metric_value > 0
        ORDER BY metric_value DESC
        LIMIT ?`
    )
    .all(args.kind, limit) as Omit<LeaderboardRow, 'rank'>[];
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Batch fetch all per-category boards in one call — used by the
 * /arena/leaderboards page so each section renders without a
 * waterfall of SQL queries.
 */
export function getAllLeaderboards(limit = 100): {
  weekly: LeaderboardRow[];
  alltime: LeaderboardRow[];
  clanWeekly: ClanLeaderboardRow[];
  clanAllTime: ClanLeaderboardRow[];
  perCategory: Record<ChallengeKind, LeaderboardRow[]>;
} {
  return {
    weekly: weeklyLeaderboard(limit),
    alltime: allTimeLeaderboard(limit),
    clanWeekly: clanWeeklyLeaderboard(50),
    clanAllTime: clanAllTimeLeaderboard(50),
    perCategory: Object.fromEntries(
      CATALOG_ORDER.map((k) => [k, perCategoryLeaderboard({ kind: k, limit: 25 })])
    ) as Record<ChallengeKind, LeaderboardRow[]>,
  };
}

/**
 * User's rank across the leaderboards. Returns null for any board
 * the user hasn't qualified for (no credits earned in scope).
 */
export function getUserRanks(userId: string): {
  weekly: number | null;
  alltime: number | null;
  clan: number | null;
} {
  const weekly = weeklyLeaderboard(1000).find((r) => r.user_id === userId);
  const alltime = allTimeLeaderboard(1000).find((r) => r.user_id === userId);
  const userClans = db()
    .prepare('SELECT id FROM clans WHERE id IN (SELECT clan_id FROM clan_members WHERE user_id = ?)')
    .all(userId) as { id: string }[];
  let clanRank: number | null = null;
  if (userClans.length > 0) {
    const boards = clanWeeklyLeaderboard(1000);
    for (const r of boards) {
      if (userClans.some((c) => c.id === r.clan_id)) {
        clanRank = r.rank;
        break;
      }
    }
  }
  return { weekly: weekly?.rank ?? null, alltime: alltime?.rank ?? null, clan: clanRank };
}

export function lastUpdatedTimestamp(): number {
  return nowMs();
}