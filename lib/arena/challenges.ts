// T42: ARENA challenges engine — CRUD over the `challenges` and
// `challenge_participants` tables. The actual scoring math (win/loss
// vs. metric) lives in `scoring.ts`. Settlement posts credits via the
// credits engine.
//
// Lifecycle for individual challenges:
//   user creates -> user accepts (auto-joins + deducts stake) -> live -> settled
//
// Lifecycle for group challenges:
//   leader creates (open) -> members join -> leader starts (live) -> settled
//
// Lifecycle for Clan Duel (G7):
//   T-0: clan_a leader invites clan_b leader
//   T+2h: clan_b accepts (otherwise invite expires)
//   T+2h: leaders recruit roster (2h window)
//   T+4h: rosters lock, build window opens (4h)
//   T+8h: portfolios lock, challenge goes live
//   T+duration: settlement

import { getDb, uuid } from '../db';
import { CATALOG, getCatalogEntry, stakeFor, maxPayoutFor, type ChallengeKind, type CatalogEntry } from './catalog';
import { applyTransaction } from './credits';

export type ChallengeRow = {
  id: string;
  kind: ChallengeKind;
  name: string;
  description: string;
  theme: string | null;
  metric: string | null;
  roster_size: number;
  stake_free: number;
  stake_sub: number;
  multiplier: number;
  duration_days: number;
  starts_at: number;
  ends_at: number;
  status: 'open' | 'live' | 'settled' | 'cancelled';
  clan_a_id: string | null;
  clan_b_id: string | null;
  winner_clan_id: string | null;
  accept_deadline: number | null;
  roster_lock_deadline: number | null;
  build_deadline: number | null;
  created_by: string;
  created_at: number;
  settled_at: number | null;
  final_score_a: number | null;
  final_score_b: number | null;
  rake_credits: number;
};

export type ParticipantRow = {
  challenge_id: string;
  user_id: string;
  clan_id: string | null;
  role: 'member' | 'leader';
  stake_paid: number;
  payout: number;
  result: 'pending' | 'won' | 'lost' | 'draw';
  joined_at: number;
  settled_at: number | null;
};

const VALID_STATUSES = new Set(['open', 'live', 'settled', 'cancelled']);

function db() {
  return getDb();
}

function nowMs() {
  return Date.now();
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/**
 * Open challenges visible on the dashboard "Open to join" tab. For
 * individual challenges, we also surface open ones even though they
 * are accept-anytime. Order by created_at desc so newly seeded
 * challenges appear first.
 */
export function listOpenChallenges(limit = 50): ChallengeRow[] {
  const rows = db()
    .prepare(
      `SELECT * FROM challenges
        WHERE status = 'open'
        ORDER BY created_at DESC
        LIMIT ?`
    )
    .all(limit) as ChallengeRow[];
  return rows.filter((r) => r.kind in CATALOG);
}

/** Challenges currently in the live phase (between start and end). */
export function listLiveChallenges(limit = 50): ChallengeRow[] {
  return db()
    .prepare(
      `SELECT * FROM challenges
        WHERE status = 'live'
        ORDER BY ends_at ASC
        LIMIT ?`
    )
    .all(limit) as ChallengeRow[];
}

/** Challenges settled or cancelled, newest first. For the History tab. */
export function listHistoryChallenges(limit = 50): ChallengeRow[] {
  return db()
    .prepare(
      `SELECT * FROM challenges
        WHERE status IN ('settled', 'cancelled')
        ORDER BY COALESCE(settled_at, created_at) DESC
        LIMIT ?`
    )
    .all(limit) as ChallengeRow[];
}

export function getChallenge(id: string): ChallengeRow | null {
  const row = db().prepare('SELECT * FROM challenges WHERE id = ?').get(id) as ChallengeRow | undefined;
  if (!row) return null;
  return row;
}

export function listParticipants(challengeId: string): ParticipantRow[] {
  return db()
    .prepare(
      `SELECT challenge_id, user_id, clan_id, role, stake_paid, payout, result, joined_at, settled_at
         FROM challenge_participants
        WHERE challenge_id = ?
        ORDER BY joined_at ASC`
    )
    .all(challengeId) as ParticipantRow[];
}

export function getParticipant(challengeId: string, userId: string): ParticipantRow | null {
  const row = db()
    .prepare(
      `SELECT challenge_id, user_id, clan_id, role, stake_paid, payout, result, joined_at, settled_at
         FROM challenge_participants
        WHERE challenge_id = ? AND user_id = ?`
    )
    .get(challengeId, userId) as ParticipantRow | undefined;
  return row ?? null;
}

export function getUserChallenges(userId: string, limit = 50): ChallengeRow[] {
  return db()
    .prepare(
      `SELECT c.* FROM challenges c
        JOIN challenge_participants p ON p.challenge_id = c.id
       WHERE p.user_id = ?
       ORDER BY p.joined_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as ChallengeRow[];
}

/**
 * Individual challenge accept-and-start. The user pays the stake
 * (free or sub tier) and is immediately entered. Challenge status
 * goes from 'open' to 'live'. For C1-C3 the duration is 1 day; for
 * longer challenges the start = now and end = now + duration.
 */
export function acceptIndividualChallenge(args: {
  userId: string;
  kind: ChallengeKind;
  isSubscriber: boolean;
  durationDays?: number;   // for C5 (1-7 range) and C7 (always 7)
}): { ok: true; challengeId: string } | { ok: false; error: string } {
  const entry = getCatalogEntry(args.kind);
  if (!entry) return { ok: false, error: 'Unknown challenge kind.' };
  if (entry.bucket !== 'individual') {
    return { ok: false, error: 'Use the group accept flow for non-individual challenges.' };
  }
  // Duration resolution: C5 accepts a player-pick 1-7; others are fixed.
  let duration = entry.duration_days;
  if (args.kind === 'C5') {
    const pick = args.durationDays ?? 1;
    if (!entry.duration_options?.includes(pick)) {
      return { ok: false, error: 'C5 duration must be 1-7 days.' };
    }
    duration = pick;
  }

  const stake = stakeFor(args.kind, args.isSubscriber);
  const id = uuid();
  const startsAt = nowMs();
  const endsAt = startsAt + duration * DAY_MS;

  const tx = db().transaction(() => {
    try {
      applyTransaction({
        userId: args.userId,
        kind: 'challenge_stake',
        amount: -stake,
        referenceId: id,
        description: `Stake for ${entry.name}`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not deduct stake.';
      return { ok: false as const, error: msg };
    }
    db().prepare(
      `INSERT INTO challenges (id, kind, name, description, theme, metric, roster_size,
        stake_free, stake_sub, multiplier, duration_days, starts_at, ends_at, status,
        clan_a_id, clan_b_id, winner_clan_id, accept_deadline, roster_lock_deadline,
        build_deadline, created_by, created_at, settled_at, final_score_a, final_score_b,
        rake_credits)
       VALUES (?, ?, ?, ?, NULL, NULL, 1, ?, ?, ?, ?, ?, ?, 'live',
        NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, NULL, NULL, NULL, 0)`
    ).run(
      id,
      args.kind,
      entry.name,
      entry.description,
      entry.stake_free,
      entry.stake_sub,
      entry.multiplier,
      duration,
      startsAt,
      endsAt,
      args.userId,
      startsAt
    );
    db().prepare(
      `INSERT INTO challenge_participants (challenge_id, user_id, clan_id, role, stake_paid, payout, result, joined_at)
       VALUES (?, ?, NULL, 'member', ?, 0, 'pending', ?)`
    ).run(id, args.userId, stake, startsAt);
    return { ok: true as const, challengeId: id };
  });
  const result = tx();
  if (!result.ok) return result;
  return { ok: true, challengeId: result.challengeId };
}

/**
 * Create an open group challenge (G1-G4) that clan members can join.
 * For G1 (clan vs benchmark) the creator's clan is implicit. For G2/G3/G4
 * the creator sets clan_a; clan_b is filled by matchmaking or invite.
 */
export function createGroupChallenge(args: {
  userId: string;
  kind: 'G1' | 'G2' | 'G3' | 'G4';
  clanId: string | null;
  isSubscriber: boolean;
  opponentClanId?: string;
}): { ok: true; challengeId: string } | { ok: false; error: string } {
  const entry = getCatalogEntry(args.kind);
  if (!entry) return { ok: false, error: 'Unknown challenge kind.' };
  if (entry.bucket !== 'group') return { ok: false, error: 'Not a group challenge.' };

  const id = uuid();
  const stake = stakeFor(args.kind, args.isSubscriber);
  const startsAt = nowMs();
  const endsAt = startsAt + entry.duration_days * DAY_MS;

  try {
    db().prepare(
      `INSERT INTO challenges (id, kind, name, description, theme, metric, roster_size,
        stake_free, stake_sub, multiplier, duration_days, starts_at, ends_at, status,
        clan_a_id, clan_b_id, winner_clan_id, accept_deadline, roster_lock_deadline,
        build_deadline, created_by, created_at, settled_at, final_score_a, final_score_b,
        rake_credits)
       VALUES (?, ?, ?, ?, NULL, NULL, 10, ?, ?, ?, ?, ?, ?, 'open',
        ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL, NULL, NULL, 0)`
    ).run(
      id,
      args.kind,
      entry.name,
      entry.description,
      entry.stake_free,
      entry.stake_sub,
      entry.multiplier,
      entry.duration_days,
      startsAt,
      endsAt,
      args.clanId,
      args.opponentClanId ?? null,
      args.userId,
      startsAt
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not create challenge.';
    return { ok: false, error: msg };
  }
  return { ok: true, challengeId: id };
}

/**
 * Join an open group challenge. Deducts stake and inserts participant row.
 * For G3 1v1 duels the second player joining flips status to live.
 */
export function joinGroupChallenge(args: {
  userId: string;
  challengeId: string;
  clanId: string | null;
  isSubscriber: boolean;
}): { ok: true; live: boolean } | { ok: false; error: string } {
  const challenge = getChallenge(args.challengeId);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };
  if (challenge.status !== 'open') return { ok: false, error: 'Challenge is no longer open.' };
  const entry = getCatalogEntry(challenge.kind);
  if (!entry) return { ok: false, error: 'Unknown challenge kind.' };

  const existing = getParticipant(args.challengeId, args.userId);
  if (existing) return { ok: false, error: 'Already joined this challenge.' };

  const stake = stakeFor(challenge.kind as ChallengeKind, args.isSubscriber);

  let wentLive = false;
  const tx = db().transaction(() => {
    try {
      applyTransaction({
        userId: args.userId,
        kind: 'challenge_stake',
        amount: -stake,
        referenceId: args.challengeId,
        description: `Stake for ${entry.name}`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not deduct stake.';
      return { ok: false as const, error: msg };
    }
    db().prepare(
      `INSERT INTO challenge_participants (challenge_id, user_id, clan_id, role, stake_paid, payout, result, joined_at)
       VALUES (?, ?, ?, 'member', ?, 0, 'pending', ?)`
    ).run(args.challengeId, args.userId, args.clanId, stake, nowMs());

    // For G3 1v1 Duel, two players = auto-live.
    const count = db()
      .prepare('SELECT COUNT(*) AS c FROM challenge_participants WHERE challenge_id = ?')
      .get(args.challengeId) as { c: number };
    if (challenge.kind === 'G3' && count.c >= 2) {
      const startsAt = nowMs();
      const endsAt = startsAt + entry.duration_days * DAY_MS;
      db().prepare(
        `UPDATE challenges SET status = 'live', starts_at = ?, ends_at = ? WHERE id = ?`
      ).run(startsAt, endsAt, args.challengeId);
      wentLive = true;
    }
    return { ok: true as const };
  });
  const result = tx();
  if (!result.ok) return result;
  return { ok: true, live: wentLive };
}

/**
 * Cancel an open challenge before it goes live. Refunds all participants'
 * stakes. Only callable by the creator or a clan leader; for prototype
 * we permit the creator directly.
 */
export function cancelChallenge(args: {
  userId: string;
  challengeId: string;
}): { ok: true; refunded: number } | { ok: false; error: string } {
  const challenge = getChallenge(args.challengeId);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };
  if (challenge.created_by !== args.userId) {
    return { ok: false, error: 'Only the creator can cancel this challenge.' };
  }
  if (challenge.status !== 'open') {
    return { ok: false, error: 'Challenge is no longer open.' };
  }
  let refunded = 0;
  const tx = db().transaction(() => {
    const parts = listParticipants(args.challengeId);
    for (const p of parts) {
      applyTransaction({
        userId: p.user_id,
        kind: 'challenge_refund',
        amount: p.stake_paid,
        referenceId: args.challengeId,
        description: `Refund — challenge cancelled`,
      });
      refunded += 1;
    }
    db().prepare(`UPDATE challenges SET status = 'cancelled' WHERE id = ?`).run(args.challengeId);
  });
  tx();
  return { ok: true, refunded };
}

/**
 * Compute aggregate stats for the dashboard. Lightweight — counts by
 * status, list of "live now" + "open to join" headlines.
 */
export function getDashboardSnapshot(userId: string | null): {
  live: ChallengeRow[];
  open: ChallengeRow[];
  history: ChallengeRow[];
  totals: { live: number; open: number; history: number };
} {
  return {
    live: listLiveChallenges(20),
    open: listOpenChallenges(20),
    history: listHistoryChallenges(20),
    totals: {
      live: listLiveChallenges(1000).length,
      open: listOpenChallenges(1000).length,
      history: listHistoryChallenges(1000).length,
    },
  };
}

/**
 * Count participants for a challenge — used by the dashboard cards to
 * show "roster filled".
 */
export function countParticipants(challengeId: string): number {
  const row = db()
    .prepare('SELECT COUNT(*) AS c FROM challenge_participants WHERE challenge_id = ?')
    .get(challengeId) as { c: number };
  return row.c;
}

/**
 * Confirm-time atomic multiplier. Reads back the challenge and returns
 * its locked multiplier — the API uses this to render the "actual"
 * multiplier the user accepted (no snapshot timer state).
 */
export function getLockedMultiplier(challengeId: string): number | null {
  const row = db()
    .prepare('SELECT multiplier FROM challenges WHERE id = ?')
    .get(challengeId) as { multiplier: number } | undefined;
  return row?.multiplier ?? null;
}

/**
 * Pretty-print the multiplier per the spec — always show 2 decimal
 * places for values >=1 (e.g. 1.67×, 2.00×).
 */
export function formatMultiplier(m: number): string {
  return `${m.toFixed(2)}×`;
}

/**
 * Convenience: time remaining in ms (clamped to 0 if past ends_at).
 */
export function msRemaining(challenge: ChallengeRow, now: number = nowMs()): number {
  return Math.max(0, challenge.ends_at - now);
}

/**
 * Format ms as "Xd Yh" or "Yh Zm" depending on size. Used by cards.
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Ended';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Re-export two constants so the API layer can reach them without
// re-importing from the catalog.
export const ARENA_TIMING = {
  ACCEPT_WINDOW_MS: TWO_HOURS_MS,
  ROSTER_LOCK_MS: TWO_HOURS_MS,
  BUILD_WINDOW_MS: FOUR_HOURS_MS,
  DAY_MS,
};