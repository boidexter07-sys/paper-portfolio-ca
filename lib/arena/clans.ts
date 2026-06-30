// T42: ARENA clans — persistent groups of up to 50 members with a
// roster, leaderboard roll-ups, matchmaking opt-in, and the G7
// Clan Duel invite flow.
//
// Anti-codename: UI strings come from the callers; this module only
// returns plain-language data.

import { getDb, uuid } from '../db';

export type ClanRow = {
  id: string;
  name: string;
  description: string | null;
  leader_user_id: string;
  member_count: number;
  created_at: number;
  total_credits_won: number;
  weekly_credits_won: number;
  week_started_at: number;
  matchmaking_opt_in: number;
  circle_vs_circle_enabled: number;
  avatar_color: string;
};

export type ClanMemberRow = {
  clan_id: string;
  user_id: string;
  joined_at: number;
  role: 'leader' | 'member';
};

const MAX_CLAN_SIZE = 50;

function db() {
  return getDb();
}

function nowMs() {
  return Date.now();
}

export function getClan(id: string): ClanRow | null {
  const row = db().prepare('SELECT * FROM clans WHERE id = ?').get(id) as ClanRow | undefined;
  return row ?? null;
}

export function getClanByName(name: string): ClanRow | null {
  const row = db().prepare('SELECT * FROM clans WHERE name = ? COLLATE NOCASE').get(name) as
    | ClanRow
    | undefined;
  return row ?? null;
}

export function listClans(limit = 50, sort: 'weekly' | 'alltime' | 'newest' = 'weekly'): ClanRow[] {
  let orderBy: string;
  switch (sort) {
    case 'alltime':
      orderBy = 'total_credits_won DESC, created_at DESC';
      break;
    case 'newest':
      orderBy = 'created_at DESC';
      break;
    case 'weekly':
    default:
      orderBy = 'weekly_credits_won DESC, created_at DESC';
  }
  return db()
    .prepare(`SELECT * FROM clans ORDER BY ${orderBy} LIMIT ?`)
    .all(limit) as ClanRow[];
}

export function listUserClans(userId: string): ClanRow[] {
  return db()
    .prepare(
      `SELECT c.* FROM clans c
        JOIN clan_members m ON m.clan_id = c.id
       WHERE m.user_id = ?
       ORDER BY c.created_at ASC`
    )
    .all(userId) as ClanRow[];
}

export function listMembers(clanId: string): ClanMemberRow[] {
  return db()
    .prepare(
      'SELECT clan_id, user_id, joined_at, role FROM clan_members WHERE clan_id = ? ORDER BY joined_at ASC'
    )
    .all(clanId) as ClanMemberRow[];
}

export function getMembership(clanId: string, userId: string): ClanMemberRow | null {
  const row = db()
    .prepare('SELECT clan_id, user_id, joined_at, role FROM clan_members WHERE clan_id = ? AND user_id = ?')
    .get(clanId, userId) as ClanMemberRow | undefined;
  return row ?? null;
}

/**
 * Create a new clan. The creator becomes the leader and is auto-added
 * to the roster. Returns the new clan id.
 */
export function createClan(args: {
  userId: string;
  name: string;
  description?: string;
  avatarColor?: string;
}): { ok: true; clanId: string } | { ok: false; error: string } {
  const name = args.name.trim();
  if (name.length < 3) return { ok: false, error: 'Clan name must be at least 3 characters.' };
  if (name.length > 30) return { ok: false, error: 'Clan name must be 30 characters or fewer.' };
  if (!/^[A-Za-z0-9 _-]+$/.test(name)) {
    return { ok: false, error: 'Clan name may contain letters, numbers, spaces, hyphens, underscores only.' };
  }
  if (getClanByName(name)) return { ok: false, error: 'A clan with this name already exists.' };

  const id = uuid();
  const now = nowMs();
  try {
    const tx = db().transaction(() => {
      db().prepare(
        `INSERT INTO clans (id, name, description, leader_user_id, member_count, created_at,
          total_credits_won, weekly_credits_won, week_started_at, matchmaking_opt_in,
          circle_vs_circle_enabled, avatar_color)
         VALUES (?, ?, ?, ?, 1, ?, 0, 0, ?, 0, 0, ?)`
      ).run(
        id,
        name,
        args.description ?? null,
        args.userId,
        now,
        now,
        args.avatarColor ?? 'sand'
      );
      db().prepare(
        `INSERT INTO clan_members (clan_id, user_id, joined_at, role) VALUES (?, ?, ?, 'leader')`
      ).run(id, args.userId, now);
    });
    tx();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not create clan.';
    return { ok: false, error: msg };
  }
  return { ok: true, clanId: id };
}

export function joinClan(args: {
  userId: string;
  clanId: string;
}): { ok: true } | { ok: false; error: string } {
  const clan = getClan(args.clanId);
  if (!clan) return { ok: false, error: 'Clan not found.' };
  if (clan.member_count >= MAX_CLAN_SIZE) {
    return { ok: false, error: `This clan is at the ${MAX_CLAN_SIZE}-member cap.` };
  }
  const existing = getMembership(args.clanId, args.userId);
  if (existing) return { ok: false, error: 'Already a member of this clan.' };
  // Cap one-clan-per-user for the v1 prototype.
  const currentClans = listUserClans(args.userId);
  if (currentClans.length > 0) {
    return { ok: false, error: 'You can only be a member of one clan at a time. Leave your current clan first.' };
  }
  try {
    const tx = db().transaction(() => {
      db().prepare(
        'INSERT INTO clan_members (clan_id, user_id, joined_at, role) VALUES (?, ?, ?, ?)'
      ).run(args.clanId, args.userId, nowMs(), 'member');
      db().prepare('UPDATE clans SET member_count = member_count + 1 WHERE id = ?').run(args.clanId);
    });
    tx();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not join clan.';
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export function leaveClan(args: { userId: string; clanId: string }): { ok: true } | { ok: false; error: string } {
  const clan = getClan(args.clanId);
  if (!clan) return { ok: false, error: 'Clan not found.' };
  if (clan.leader_user_id === args.userId) {
    return { ok: false, error: 'Leaders must transfer leadership before leaving. (Leadership transfer is on the roadmap.)' };
  }
  const existing = getMembership(args.clanId, args.userId);
  if (!existing) return { ok: false, error: 'Not a member of this clan.' };
  try {
    const tx = db().transaction(() => {
      db().prepare('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?').run(args.clanId, args.userId);
      db().prepare('UPDATE clans SET member_count = member_count - 1 WHERE id = ?').run(args.clanId);
    });
    tx();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not leave clan.';
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export function setMatchmakingOptIn(args: {
  userId: string;
  clanId: string;
  enabled: boolean;
  circleVsCircle?: boolean;
}): { ok: true } | { ok: false; error: string } {
  const clan = getClan(args.clanId);
  if (!clan) return { ok: false, error: 'Clan not found.' };
  if (clan.leader_user_id !== args.userId) return { ok: false, error: 'Only the clan leader can change matchmaking.' };
  db().prepare(
    `UPDATE clans SET matchmaking_opt_in = ?, circle_vs_circle_enabled = ? WHERE id = ?`
  ).run(args.enabled ? 1 : 0, args.circleVsCircle ? 1 : 0, args.clanId);
  return { ok: true };
}

/**
 * Apply a credit win to a clan's roll-up. Called from settlement. If
 * the clan has rolled over to a new ISO week, reset the weekly counter
 * before applying.
 */
export function applyCreditsToClan(args: { clanId: string; credits: number }): void {
  const clan = getClan(args.clanId);
  if (!clan) return;
  const now = nowMs();
  const isNewWeek = now - clan.week_started_at > 7 * 24 * 60 * 60 * 1000;
  const tx = db().transaction(() => {
    if (isNewWeek) {
      db().prepare(
        `UPDATE clans SET weekly_credits_won = ?, week_started_at = ?, total_credits_won = total_credits_won + ? WHERE id = ?`
      ).run(args.credits, now, args.credits, args.clanId);
    } else {
      db().prepare(
        `UPDATE clans SET weekly_credits_won = weekly_credits_won + ?, total_credits_won = total_credits_won + ? WHERE id = ?`
      ).run(args.credits, args.credits, args.clanId);
    }
  });
  tx();
}

/**
 * Per-clan analytics. Denormalized counters + computed totals — used
 * by the clan dashboard page.
 */
export function getClanAnalytics(clanId: string): {
  member_count: number;
  total_credits_won: number;
  weekly_credits_won: number;
  challenges_active: number;
  challenges_settled: number;
  rank_weekly: number;
} {
  const clan = getClan(clanId);
  if (!clan) {
    return {
      member_count: 0, total_credits_won: 0, weekly_credits_won: 0,
      challenges_active: 0, challenges_settled: 0, rank_weekly: 0,
    };
  }
  const active = db()
    .prepare(
      `SELECT COUNT(DISTINCT challenge_id) AS c FROM challenge_participants
       WHERE clan_id = ? AND challenge_id IN (SELECT id FROM challenges WHERE status = 'live')`
    )
    .get(clanId) as { c: number };
  const settled = db()
    .prepare(
      `SELECT COUNT(DISTINCT challenge_id) AS c FROM challenge_participants
       WHERE clan_id = ? AND challenge_id IN (SELECT id FROM challenges WHERE status = 'settled')`
    )
    .get(clanId) as { c: number };
  // Rank by weekly credits won.
  const rank = db()
    .prepare(
      `SELECT COUNT(*) + 1 AS r FROM clans WHERE weekly_credits_won > ? AND id != ?`
    )
    .get(clan.weekly_credits_won, clanId) as { r: number };
  return {
    member_count: clan.member_count,
    total_credits_won: clan.total_credits_won,
    weekly_credits_won: clan.weekly_credits_won,
    challenges_active: active.c,
    challenges_settled: settled.c,
    rank_weekly: rank.r,
  };
}

/**
 * Update the denormalized clan_leaderboards table. Called on
 * settlement; one row per (clan, scope, period). For all-time, the
 * period_key is 'all'. For weekly, it's 'YYYY-WW'.
 */
export function upsertClanLeaderboard(args: {
  clanId: string;
  scope: 'weekly' | 'alltime';
  periodKey: string;
  creditsWon: number;
  challengeWins: number;
}): void {
  const memberCountRow = db()
    .prepare('SELECT member_count FROM clans WHERE id = ?')
    .get(args.clanId) as { member_count: number } | undefined;
  const memberCount = memberCountRow?.member_count ?? 0;
  const existing = db()
    .prepare(
      'SELECT total_credits_won FROM clan_leaderboards WHERE clan_id = ? AND scope = ? AND period_key = ?'
    )
    .get(args.clanId, args.scope, args.periodKey) as { total_credits_won: number } | undefined;
  if (existing) {
    db().prepare(
      `UPDATE clan_leaderboards
          SET total_credits_won = total_credits_won + ?, challenge_wins = challenge_wins + ?,
              member_count = ?, updated_at = ?
        WHERE clan_id = ? AND scope = ? AND period_key = ?`
    ).run(args.creditsWon, args.challengeWins, memberCount, nowMs(), args.clanId, args.scope, args.periodKey);
  } else {
    db().prepare(
      `INSERT INTO clan_leaderboards (clan_id, scope, period_key, total_credits_won, challenge_wins, member_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(args.clanId, args.scope, args.periodKey, args.creditsWon, args.challengeWins, memberCount, nowMs());
  }
}

export const CLAN_LIMITS = {
  MAX_CLAN_SIZE,
  NAME_MIN: 3,
  NAME_MAX: 30,
};