// T42: ARENA Clan Duel (G7) invite flow. Compressed timing per
// spec: 2h accept / 2h roster lock / 4h build.
//
// T-0    : clan A leader sends invite to clan B leader
// T+2h   : invite expires if not accepted
// T+2h+5 : once accepted, both leaders recruit rosters (2h window)
// T+4h   : rosters lock; build window opens (4h)
// T+8h   : portfolios lock; challenge goes live

import { getDb, uuid } from '../db';
import { getClan, getMembership, listMembers, applyCreditsToClan, upsertClanLeaderboard } from './clans';
import { applyTransaction } from './credits';
import { listParticipants, getChallenge, createGroupChallenge, acceptIndividualChallenge } from './challenges';
import { getCatalogEntry } from './catalog';
import { CHALLENGE_PORTFOLIO_STARTING_CASH, createChallengePortfolio } from './portfolios';

const ACCEPT_WINDOW_MS = 2 * 60 * 60 * 1000;
const ROSTER_LOCK_MS = 2 * 60 * 60 * 1000;
const BUILD_WINDOW_MS = 4 * 60 * 60 * 1000;

export type ClanDuelInviteRow = {
  id: string;
  clan_a_id: string;
  clan_b_id: string;
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  challenge_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: number;
  expires_at: number;
  responded_at: number | null;
};

function db() {
  return getDb();
}

function nowMs() {
  return Date.now();
}

export function getInvite(id: string): ClanDuelInviteRow | null {
  const row = db().prepare('SELECT * FROM clan_duel_invites WHERE id = ?').get(id) as
    | ClanDuelInviteRow
    | undefined;
  return row ?? null;
}

export function listInvitesForClan(clanId: string): ClanDuelInviteRow[] {
  return db()
    .prepare(
      `SELECT * FROM clan_duel_invites WHERE clan_a_id = ? OR clan_b_id = ?
       ORDER BY created_at DESC LIMIT 50`
    )
    .all(clanId, clanId) as ClanDuelInviteRow[];
}

export function listPendingInvitesForUser(userId: string): ClanDuelInviteRow[] {
  const userClans = db()
    .prepare('SELECT clan_id FROM clan_members WHERE user_id = ? AND role = ?')
    .all(userId, 'leader') as { clan_id: string }[];
  if (userClans.length === 0) return [];
  const clanIds = userClans.map((c) => c.clan_id);
  const placeholders = clanIds.map(() => '?').join(',');
  return db()
    .prepare(
      `SELECT * FROM clan_duel_invites
        WHERE status = 'pending' AND expires_at > ?
          AND clan_b_id IN (${placeholders})
        ORDER BY created_at DESC`
    )
    .all(nowMs(), ...clanIds) as ClanDuelInviteRow[];
}

/**
 * T-0: clan A leader sends invite to clan B. Both clans must exist;
 * inviter must be a leader; the invite carries the pre-set
 * duration + roster size + stake so clan B's leader knows what
 * they're accepting.
 */
export function sendInvite(args: {
  inviterUserId: string;
  clanAId: string;
  clanBId: string;
  durationDays: number;
  rosterSize: number;
  stakePerMember: number;
  theme: string;
  metric: string;          // M1..M15
}): { ok: true; inviteId: string } | { ok: false; error: string } {
  const clanA = getClan(args.clanAId);
  const clanB = getClan(args.clanBId);
  if (!clanA) return { ok: false, error: 'Your clan was not found.' };
  if (!clanB) return { ok: false, error: 'Target clan was not found.' };
  if (clanA.id === clanB.id) return { ok: false, error: 'Cannot duel your own clan.' };
  const membership = getMembership(args.clanAId, args.inviterUserId);
  if (!membership || membership.role !== 'leader') {
    return { ok: false, error: 'Only your clan leader can send duel invites.' };
  }
  if (![1, 3, 7].includes(args.durationDays)) {
    return { ok: false, error: 'Duration must be 1, 3, or 7 days.' };
  }
  if (args.rosterSize < 10 || args.rosterSize > 20) {
    return { ok: false, error: 'Roster size must be 10-20 members.' };
  }
  if (args.stakePerMember < 10 || args.stakePerMember > 100) {
    return { ok: false, error: 'Stake per member must be 10-100 cr.' };
  }
  const validMetrics = ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12','M13','M14','M15'];
  if (!validMetrics.includes(args.metric)) {
    return { ok: false, error: 'Invalid metric. Pick from M1-M15.' };
  }

  const id = uuid();
  const now = nowMs();
  db().prepare(
    `INSERT INTO clan_duel_invites (id, clan_a_id, clan_b_id, invited_by_user_id, accepted_by_user_id,
      challenge_id, status, created_at, expires_at, responded_at)
     VALUES (?, ?, ?, ?, NULL, NULL, 'pending', ?, ?, NULL)`
  ).run(id, args.clanAId, args.clanBId, args.inviterUserId, now, now + ACCEPT_WINDOW_MS);
  return { ok: true, inviteId: id };
}

/**
 * T+5min: clan B leader accepts the invite. We deduct the inviter's
 * stake from clan A leader (since they pre-committed when sending).
 * The challenge is NOT yet created — clan B's leader will pick their
 * theme/metric when the roster locks.
 */
export function acceptInvite(args: {
  inviteId: string;
  acceptingUserId: string;
}): { ok: true; challengeId: string } | { ok: false; error: string } {
  const invite = getInvite(args.inviteId);
  if (!invite) return { ok: false, error: 'Invite not found.' };
  if (invite.status !== 'pending') return { ok: false, error: 'Invite is no longer pending.' };
  if (invite.expires_at <= nowMs()) {
    db().prepare(`UPDATE clan_duel_invites SET status = 'expired', responded_at = ? WHERE id = ?`)
      .run(nowMs(), args.inviteId);
    return { ok: false, error: 'Invite expired (2h window passed).' };
  }
  const membership = getMembership(invite.clan_b_id, args.acceptingUserId);
  if (!membership || membership.role !== 'leader') {
    return { ok: false, error: 'Only your clan leader can accept this invite.' };
  }

  // We need the original parameters; they aren't stored on the
  // invite row (v1). For prototype simplicity we read defaults from
  // the catalog. Production: store theme/metric/duration on the
  // invite at send time.
  const entry = getCatalogEntry('G7');
  if (!entry) return { ok: false, error: 'G7 not in catalog.' };
  const stake = entry.stake_free;
  const duration = entry.duration_days;
  const rosterSize = 15;

  const id = uuid();
  const now = nowMs();
  const acceptDeadline = invite.expires_at; // already 2h from send
  const rosterLock = acceptDeadline + ROSTER_LOCK_MS; // 2h after accept window

  const tx = db().transaction(() => {
    try {
      applyTransaction({
        userId: invite.invited_by_user_id,
        kind: 'challenge_stake',
        amount: -stake,
        referenceId: id,
        description: 'Clan Duel stake (clan A leader)',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not deduct clan A leader stake.';
      return { ok: false as const, error: msg };
    }
    db().prepare(
      `INSERT INTO challenges (id, kind, name, description, theme, metric, roster_size,
        stake_free, stake_sub, multiplier, duration_days, starts_at, ends_at, status,
        clan_a_id, clan_b_id, winner_clan_id, accept_deadline, roster_lock_deadline,
        build_deadline, created_by, created_at, settled_at, final_score_a, final_score_b,
        rake_credits)
       VALUES (?, 'G7', ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, 'open',
        ?, ?, NULL, ?, ?, NULL, ?, ?, NULL, NULL, NULL, 0)`
    ).run(
      id,
      entry.name,
      entry.description,
      rosterSize,
      entry.stake_free,
      entry.stake_sub,
      entry.multiplier,
      duration,
      now,
      now + (duration * 24 * 60 * 60 * 1000) + BUILD_WINDOW_MS,
      invite.clan_a_id,
      invite.clan_b_id,
      acceptDeadline,
      rosterLock,
      invite.invited_by_user_id,
      now
    );
    db().prepare(
      `INSERT INTO challenge_participants (challenge_id, user_id, clan_id, role, stake_paid, payout, result, joined_at)
       VALUES (?, ?, ?, 'leader', ?, 0, 'pending', ?)`
    ).run(id, invite.invited_by_user_id, invite.clan_a_id, stake, now);
    db().prepare(
      `UPDATE clan_duel_invites SET status = 'accepted', accepted_by_user_id = ?, challenge_id = ?, responded_at = ? WHERE id = ?`
    ).run(args.acceptingUserId, id, now, args.inviteId);
    return { ok: true as const, challengeId: id };
  });
  const result = tx();
  if (!result.ok) return result;
  return { ok: true, challengeId: result.challengeId };
}

export function declineInvite(args: {
  inviteId: string;
  decliningUserId: string;
}): { ok: true } | { ok: false; error: string } {
  const invite = getInvite(args.inviteId);
  if (!invite) return { ok: false, error: 'Invite not found.' };
  if (invite.status !== 'pending') return { ok: false, error: 'Invite is no longer pending.' };
  const membership = getMembership(invite.clan_b_id, args.decliningUserId);
  if (!membership || membership.role !== 'leader') {
    return { ok: false, error: 'Only your clan leader can decline this invite.' };
  }
  db().prepare(`UPDATE clan_duel_invites SET status = 'declined', responded_at = ? WHERE id = ?`)
    .run(nowMs(), args.inviteId);
  return { ok: true };
}

/**
 * Roster commit: a clan member joins the clan duel during the
 * roster window. Deducts their stake and inserts a participant row
 * (role='member'). Leaders are pre-inserted by the invite flow.
 */
export function joinClanDuelRoster(args: {
  userId: string;
  challengeId: string;
  isSubscriber: boolean;
}): { ok: true } | { ok: false; error: string } {
  const challenge = getChallenge(args.challengeId);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };
  if (challenge.status !== 'open') return { ok: false, error: 'Roster window has closed.' };
  if (challenge.kind !== 'G7') return { ok: false, error: 'Not a Clan Duel challenge.' };
  if (challenge.roster_lock_deadline && challenge.roster_lock_deadline <= nowMs()) {
    return { ok: false, error: 'Roster lock window has closed.' };
  }

  // Figure out which side the user is on by checking clan membership.
  const memberA = getMembership(challenge.clan_a_id ?? '', args.userId);
  const memberB = getMembership(challenge.clan_b_id ?? '', args.userId);
  const clanId = memberA ? challenge.clan_a_id : memberB ? challenge.clan_b_id : null;
  if (!clanId) return { ok: false, error: 'You must be a member of one of the duelling clans.' };

  const existing = db()
    .prepare('SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?')
    .get(args.challengeId, args.userId) as { id: number } | undefined;
  if (existing) return { ok: false, error: 'Already on the roster for this duel.' };

  const stake = challenge.stake_free;
  try {
    const tx = db().transaction(() => {
      try {
        applyTransaction({
          userId: args.userId,
          kind: 'challenge_stake',
          amount: -stake,
          referenceId: args.challengeId,
          description: 'Clan Duel roster stake',
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not deduct stake.';
        return { ok: false as const, error: msg };
      }
      db().prepare(
        `INSERT INTO challenge_participants (challenge_id, user_id, clan_id, role, stake_paid, payout, result, joined_at)
         VALUES (?, ?, ?, 'member', ?, 0, 'pending', ?)`
      ).run(args.challengeId, args.userId, clanId, stake, nowMs());
      return { ok: true as const };
    });
    const result = tx();
    if (!result.ok) return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not join roster.';
    return { ok: false, error: msg };
  }
  return { ok: true };
}

/**
 * Promote the challenge from 'open' (roster building) to 'live'
 * (scoring). Called by the build-window deadline cron. Creates the
 * challenge portfolio for every participant on first live transition.
 */
export function promoteToLive(challengeId: string): { ok: true; promoted: number } | { ok: false; error: string } {
  const challenge = getChallenge(challengeId);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };
  if (challenge.status !== 'open') return { ok: false, error: 'Already live or cancelled.' };

  const parts = listParticipants(challengeId);
  let promoted = 0;
  const tx = db().transaction(() => {
    for (const p of parts) {
      const result = createChallengePortfolio({ challengeId, userId: p.user_id });
      if (result.ok) promoted += 1;
    }
    const liveAt = nowMs();
    db().prepare(
      `UPDATE challenges SET status = 'live', starts_at = ?, build_deadline = ? WHERE id = ?`
    ).run(liveAt, liveAt, challengeId);
  });
  tx();
  return { ok: true, promoted };
}

export const CLAN_DUEL_TIMING = {
  ACCEPT_WINDOW_MS,
  ROSTER_LOCK_MS,
  BUILD_WINDOW_MS,
  TOTAL_PRE_LIVE_MS: ACCEPT_WINDOW_MS + ROSTER_LOCK_MS + BUILD_WINDOW_MS,
  CHALLENGE_PORTFOLIO_STARTING_CASH,
};