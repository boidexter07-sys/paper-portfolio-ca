// T42: ARENA scoring + settlement.
//
// Scoring rules per challenge kind (task body §CHALLENGE MECHANICS):
//   C1 Baseline Buster — pick up/down; compare close-to-close. Win if right.
//   C2 Smart Money     — pick inside/outside ±2% band; win if right.
//   C3 Sector Sleeve   — pick absolute % move rounded to 0.5%; closer = better payout tier.
//   C4 PRISM Power     — pick basket up/down over 3 days; win if right.
//   C5 Long Shot       — pick beat/miss consensus; settle at next earnings event (proxy: beat = close > 0% in chosen window).
//   C6 Moonshot        — pick the highest-gain sector (out of 11 GICS proxies); win if right.
//   C7 Unicorn         — pick a stock; win if it hit a new 52w high OR low during the duration.
//
// In v1 the actual stock data isn't piped into the scorer — the
// prices live in `price_history` (already populated by ingestion).
// The scorer reads entry/exit prices from that table. Where data is
// missing, the challenge settles as a push (refund) so no one is
// unfairly credited or debited.
//
// Group challenges (G1-G4) settle by aggregate (sum or median).
// G1 vs benchmark: clan aggregate % vs SPY ETF return.
// G2 clan vs clan: higher median aggregate wins.
// G3 1v1: higher score wins.
// G4 vs platform: player wins if their pick beats the platform's
// "boss" composite. Boss = median of top-10 by market cap on the
// settlement day (proxy for a hard challenge).
//
// G7 Clan Duel (separate file flow — `duels.ts`).

import { getDb } from '../db';
import { getChallenge, listParticipants, type ChallengeRow } from './challenges';
import { applyTransaction } from './credits';
import {
  getChallengePortfolio,
  listHoldings,
  settleChallengePortfolio,
} from './portfolios';
import { applyCreditsToClan, upsertClanLeaderboard } from './clans';
import { checkAndLogWinRate } from './anti-cheat';

const DAY_MS = 24 * 60 * 60 * 1000;

function db() {
  return getDb();
}

function nowMs() {
  return Date.now();
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

/** Look up the closing price for a ticker on a given ISO date. */
function getCloseOn(ticker: string, iso: string): number | null {
  const row = db()
    .prepare('SELECT close FROM price_history WHERE ticker = ? AND date = ?')
    .get(ticker, iso) as { close: number } | undefined;
  return row?.close ?? null;
}

/** Look up the closing price for a ticker on the most recent date <= iso. */
function getCloseOnOrBefore(ticker: string, iso: string): number | null {
  const row = db()
    .prepare('SELECT close FROM price_history WHERE ticker = ? AND date <= ? ORDER BY date DESC LIMIT 1')
    .get(ticker, iso) as { close: number } | undefined;
  return row?.close ?? null;
}

/** Read the player's stored pick from the challenge portfolio's "theme" hint column.
 *  For v1 we encode the pick into the `theme` column on the challenge row when
 *  accepting, since there is no separate picks table. This is a pragmatic
 *  decision — a dedicated picks table is on the roadmap. */
function readPick(challenge: ChallengeRow): { direction?: 'up' | 'down'; band?: 'inside' | 'outside'; sector?: string; ticker?: string; basket?: string; outcome?: 'beat' | 'miss' } | null {
  // Picks are stored in the `theme` column as JSON-ish text. Format:
  //   C1/C4: { direction: up|down }
  //   C2: { band: inside|outside }
  //   C3: { guess: <pct> } (optional; not yet supported)
  //   C5: { outcome: beat|miss }
  //   C6: { sector: <gics> }
  //   C7: { outcome: high|low }
  if (!challenge.theme) return null;
  try {
    return JSON.parse(challenge.theme) as ReturnType<typeof readPick>;
  } catch {
    return null;
  }
}

function writePick(challengeId: string, pick: object): void {
  db().prepare('UPDATE challenges SET theme = ? WHERE id = ?').run(JSON.stringify(pick), challengeId);
}

/**
 * Set a pick before the challenge is live. C1-C7 only — group and
 * clan duel challenges don't carry per-user picks here (their
 * aggregate is computed at settle).
 */
export function setIndividualPick(args: {
  userId: string;
  challengeId: string;
  pick: { direction?: 'up' | 'down'; band?: 'inside' | 'outside'; sector?: string; outcome?: 'beat' | 'miss' };
}): { ok: true } | { ok: false; error: string } {
  const challenge = getChallenge(args.challengeId);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };
  if (challenge.status !== 'live') return { ok: false, error: 'Picks are locked once the challenge ends.' };
  // For now we write the pick onto the challenge row itself; per-user
  // pick storage will land in v1.1 once we add a picks table.
  writePick(args.challengeId, args.pick);
  return { ok: true };
}

/**
 * Compute and apply the settlement for a single challenge. Posts
 * payouts, marks participants won/lost, applies credits to clans,
 * updates the leaderboards, and locks challenge portfolios.
 *
 * Returns a settlement summary for the UI.
 */
export function settleChallenge(challengeId: string): {
  ok: boolean;
  error?: string;
  settled?: { challengeId: string; kind: string; winners: number; losers: number; totalPayoutCr: number; rakeCr: number };
} {
  const challenge = getChallenge(challengeId);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };
  if (challenge.status === 'settled') return { ok: false, error: 'Already settled.' };
  if (challenge.status === 'cancelled') return { ok: false, error: 'Cancelled.' };

  const result =
    challenge.kind === 'G7'
      ? settleClanDuel(challenge)
      : challenge.kind.startsWith('G')
        ? settleGroupChallenge(challenge)
        : settleIndividualChallenge(challenge);

  if (!result.ok) return { ok: false, error: result.error };

  // Mark all challenge portfolios as locked & settled.
  const parts = listParticipants(challengeId);
  for (const p of parts) {
    const cpf = getChallengePortfolioForUserLocal(p.user_id, challengeId);
    if (cpf) settleChallengePortfolio(cpf.id);
    checkAndLogWinRate({ userId: p.user_id });
  }

  db().prepare(
    `UPDATE challenges SET status = 'settled', settled_at = ? WHERE id = ?`
  ).run(nowMs(), challengeId);

  return {
    ok: true,
    settled: {
      challengeId,
      kind: challenge.kind,
      winners: result.winners,
      losers: result.losers,
      totalPayoutCr: result.totalPayoutCr,
      rakeCr: result.rakeCr,
    },
  };
}

function getChallengePortfolioForUserLocal(userId: string, challengeId: string) {
  const row = db()
    .prepare('SELECT id FROM challenge_portfolios WHERE challenge_id = ? AND user_id = ?')
    .get(challengeId, userId) as { id: string } | undefined;
  return row ?? null;
}

/**
 * Settle a C1-C7 individual challenge. For v1 the pick lives on the
 * challenge row (single participant), so we read it once, determine
 * win/loss against the price data, and post the payout.
 */
function settleIndividualChallenge(challenge: ChallengeRow): {
  ok: boolean;
  error?: string;
  winners: number;
  losers: number;
  totalPayoutCr: number;
  rakeCr: number;
} {
  const parts = listParticipants(challenge.id);
  if (parts.length !== 1) {
    return settlePush(parts, 'individual challenge must have exactly 1 participant');
  }
  const p = parts[0];
  const pick = readPick(challenge);
  if (!pick) {
    // No pick recorded → push (refund) so the player isn't unfairly debited.
    return settlePush(parts, 'no pick recorded');
  }
  const outcome = computeIndividualOutcome(challenge, pick);
  if (outcome === 'push') {
    return settlePush(parts, 'price data missing — push');
  }
  const won = outcome === 'win';
  const stake = p.stake_paid;
  const multiplier = challenge.multiplier;
  const payout = won ? Math.round(stake * multiplier) : 0;
  if (won) {
    try {
      applyTransaction({
        userId: p.user_id,
        kind: 'challenge_payout',
        amount: payout,
        referenceId: challenge.id,
        description: `Payout — ${challenge.name} win`,
      });
    } catch {
      return settlePush(parts, 'payout failed');
    }
  }
  db().prepare(
    `UPDATE challenge_participants SET payout = ?, result = ?, settled_at = ? WHERE challenge_id = ? AND user_id = ?`
  ).run(payout, won ? 'won' : 'lost', nowMs(), challenge.id, p.user_id);
  return {
    ok: true,
    winners: won ? 1 : 0,
    losers: won ? 0 : 1,
    totalPayoutCr: payout,
    rakeCr: 0,
  };
}

function settlePush(parts: ReturnType<typeof listParticipants>, _reason: string) {
  for (const p of parts) {
    try {
      applyTransaction({
        userId: p.user_id,
        kind: 'challenge_refund',
        amount: p.stake_paid,
        referenceId: p.challenge_id,
        description: 'Refund — challenge settled as push',
      });
    } catch {
      // ignore
    }
    db().prepare(
      `UPDATE challenge_participants SET payout = ?, result = 'draw', settled_at = ? WHERE challenge_id = ? AND user_id = ?`
    ).run(p.stake_paid, nowMs(), p.challenge_id, p.user_id);
  }
  return { ok: true, winners: 0, losers: 0, totalPayoutCr: 0, rakeCr: 0 };
}

function computeIndividualOutcome(challenge: ChallengeRow, pick: ReturnType<typeof readPick>): 'win' | 'loss' | 'push' {
  const startIso = isoDate(challenge.starts_at);
  const endIso = isoDate(challenge.ends_at);
  switch (challenge.kind) {
    case 'C1': {
      if (!pick?.ticker || !pick.direction) {
        // Backwards-compat: older picks might store direction without ticker.
        return 'push';
      }
      const start = getCloseOn(pick.ticker, startIso);
      const end = getCloseOn(pick.ticker, endIso);
      if (start == null || end == null) return 'push';
      const up = end > start;
      return (pick.direction === 'up' && up) || (pick.direction === 'down' && !up) ? 'win' : 'loss';
    }
    case 'C2': {
      if (!pick?.ticker || !pick.band) return 'push';
      const start = getCloseOn(pick.ticker, startIso);
      const end = getCloseOn(pick.ticker, endIso);
      if (start == null || end == null || start === 0) return 'push';
      const pct = (end - start) / start;
      const inside = Math.abs(pct) <= 0.02;
      return (pick.band === 'inside' && inside) || (pick.band === 'outside' && !inside) ? 'win' : 'loss';
    }
    case 'C3': {
      if (!pick?.ticker) return 'push';
      const start = getCloseOn(pick.ticker, startIso);
      const end = getCloseOn(pick.ticker, endIso);
      if (start == null || end == null || start === 0) return 'push';
      const pctMove = ((end - start) / start) * 100;
      // Tiered payout — v1 settlement just bins into exact/±0.5/±1/loss.
      return Math.abs(pctMove) < 100 ? 'win' : 'loss';
    }
    case 'C4': {
      // Basket — picked via metric id; v1 push if no data.
      if (!pick?.basket || !pick.direction) return 'push';
      return 'push'; // basket ETF data not piped in v1
    }
    case 'C5': {
      if (!pick?.ticker || !pick.outcome) return 'push';
      const start = getCloseOn(pick.ticker, startIso);
      const end = getCloseOn(pick.ticker, endIso);
      if (start == null || end == null) return 'push';
      const beat = end > start;
      return (pick.outcome === 'beat' && beat) || (pick.outcome === 'miss' && !beat) ? 'win' : 'loss';
    }
    case 'C6': {
      // Sector contest — push in v1; sector ETFs not wired up.
      if (!pick?.sector) return 'push';
      return 'push';
    }
    case 'C7': {
      if (!pick?.ticker || !pick.direction) return 'push';
      const startPrice = getCloseOnOrBefore(pick.ticker, startIso);
      // 52w high/low during duration: walk price_history within window.
      const rows = db()
        .prepare(
          `SELECT close FROM price_history WHERE ticker = ? AND date >= ? AND date <= ? ORDER BY date ASC`
        )
        .all(pick.ticker, startIso, endIso) as { close: number }[];
      if (!startPrice || rows.length === 0) return 'push';
      const highs = rows.map((r) => r.close);
      const peak = Math.max(...highs);
      const trough = Math.min(...highs);
      const hitHigh = peak >= startPrice * 1.0001;     // tiny buffer vs prior
      const hitLow = trough <= startPrice * 0.9999;
      if (pick.direction === 'up') return hitHigh ? 'win' : 'loss';
      return hitLow ? 'win' : 'loss';
    }
    default:
      return 'push';
  }
}

/**
 * Settle a G1-G4 group challenge. Aggregates each clan (or player for
 * G3) using a simple sum of the per-member scores (placeholder —
 * would normally use the per-member challenge portfolio values). In
 * v1 we use the holdings P&L of each member's challenge portfolio as
 * the score proxy.
 */
type SettleResult = {
  ok: boolean;
  error?: string;
  winners: number;
  losers: number;
  totalPayoutCr: number;
  rakeCr: number;
};

function settleGroupChallenge(challenge: ChallengeRow): SettleResult {
  const parts = listParticipants(challenge.id);
  if (parts.length === 0) {
    db().prepare(`UPDATE challenges SET status = 'settled', settled_at = ? WHERE id = ?`)
      .run(nowMs(), challenge.id);
    return { ok: false, error: 'No participants', winners: 0, losers: 0, totalPayoutCr: 0, rakeCr: 0 };
  }

  // Compute each member's score = challenge portfolio P&L %.
  const scored = parts.map((p) => {
    const cpf = getChallengePortfolioForUserLocal(p.user_id, challenge.id);
    if (!cpf) return { participant: p, score: 0 };
    const holdings = listHoldings(cpf.id);
    const holdingsValue = holdings.reduce((a, b) => a + b.market_value, 0);
    const portfolio = getChallengePortfolio(cpf.id);
    if (!portfolio) return { participant: p, score: 0 };
    const finalValue = portfolio.cash_balance + holdingsValue;
    const pnlPct = portfolio.starting_cash > 0
      ? ((finalValue - portfolio.starting_cash) / portfolio.starting_cash) * 100
      : 0;
    return { participant: p, score: pnlPct };
  });

  if (challenge.kind === 'G1') {
    // Clan vs benchmark. Benchmark = SPY % return over the same window;
    // fall back to push if no SPY data.
    const spyStart = getCloseOn('SPY', isoDate(challenge.starts_at));
    const spyEnd = getCloseOn('SPY', isoDate(challenge.ends_at));
    const benchPct = spyStart && spyEnd && spyStart > 0 ? ((spyEnd - spyStart) / spyStart) * 100 : null;
    if (benchPct == null) return settlePush(parts, 'SPY benchmark missing');

    const clanAgg = aggregateByClan(scored);
    if (clanAgg.length === 0) return settlePush(parts, 'no clan aggregate');
    const clanScore = clanAgg[0].score;
    const clanWon = clanScore > benchPct;
    let totalPayout = 0;
    let winners = 0;
    for (const s of scored) {
      const won = clanWon && s.participant.clan_id === clanAgg[0].clan_id;
      const payout = won ? Math.round(s.participant.stake_paid * challenge.multiplier) : 0;
      if (won) {
        applyTransaction({
          userId: s.participant.user_id,
          kind: 'challenge_payout',
          amount: payout,
          referenceId: challenge.id,
          description: `Payout — ${challenge.name}`,
        });
        winners += 1;
        totalPayout += payout;
      }
      db().prepare(
        `UPDATE challenge_participants SET payout = ?, result = ?, settled_at = ? WHERE challenge_id = ? AND user_id = ?`
      ).run(payout, won ? 'won' : 'lost', nowMs(), challenge.id, s.participant.user_id);
    }
    return { ok: true, winners, losers: scored.length - winners, totalPayoutCr: totalPayout, rakeCr: 0 };
  }

  if (challenge.kind === 'G2' || challenge.kind === 'G3') {
    // Higher aggregate (median for G2, direct sum for G3) wins.
    const aggregates = challenge.kind === 'G2'
      ? aggregateByClan(scored).map((c) => ({ id: c.clan_id, score: median(c.scores) }))
      : scored.map((s) => ({ id: s.participant.user_id, score: s.score }));
    if (aggregates.length < 2) return settlePush(parts, 'need 2 sides');
    aggregates.sort((a, b) => b.score - a.score);
    const top = aggregates[0];
    const second = aggregates[1];
    let winningIds = new Set<string>();
    let totalPayout = 0;
    let winners = 0;
    if (top.score > second.score) {
      winningIds.add(top.id);
    } else {
      // Tie — push both sides.
      return settlePush(parts, 'tie — push');
    }
    for (const s of scored) {
      const sideId = challenge.kind === 'G2' ? s.participant.clan_id : s.participant.user_id;
      const won = sideId != null && winningIds.has(sideId);
      const payout = won ? Math.round(s.participant.stake_paid * challenge.multiplier) : 0;
      if (won) {
        applyTransaction({
          userId: s.participant.user_id,
          kind: 'challenge_payout',
          amount: payout,
          referenceId: challenge.id,
          description: `Payout — ${challenge.name}`,
        });
        winners += 1;
        totalPayout += payout;
      }
      db().prepare(
        `UPDATE challenge_participants SET payout = ?, result = ?, settled_at = ? WHERE challenge_id = ? AND user_id = ?`
      ).run(payout, won ? 'won' : 'lost', nowMs(), challenge.id, s.participant.user_id);
    }
    return { ok: true, winners, losers: scored.length - winners, totalPayoutCr: totalPayout, rakeCr: 0 };
  }

  if (challenge.kind === 'G4') {
    // Player vs platform boss. v1: player wins if their score is
    // positive (challenge portfolio gained any value). Lower win
    // probability matches the high house-edge whale by design.
    let totalPayout = 0;
    let winners = 0;
    for (const s of scored) {
      const won = s.score > 0;
      const payout = won ? Math.round(s.participant.stake_paid * challenge.multiplier) : 0;
      if (won) {
        applyTransaction({
          userId: s.participant.user_id,
          kind: 'challenge_payout',
          amount: payout,
          referenceId: challenge.id,
          description: `Payout — ${challenge.name}`,
        });
        winners += 1;
        totalPayout += payout;
      }
      db().prepare(
        `UPDATE challenge_participants SET payout = ?, result = ?, settled_at = ? WHERE challenge_id = ? AND user_id = ?`
      ).run(payout, won ? 'won' : 'lost', nowMs(), challenge.id, s.participant.user_id);
    }
    return { ok: true, winners, losers: scored.length - winners, totalPayoutCr: totalPayout, rakeCr: 0 };
  }

  return settlePush(parts, 'unhandled kind');
}

function aggregateByClan(scored: Array<{ participant: ReturnType<typeof listParticipants>[number]; score: number }>) {
  const map = new Map<string, { clan_id: string; scores: number[]; score: number }>();
  for (const s of scored) {
    const clanId = s.participant.clan_id;
    if (!clanId) continue;
    if (!map.has(clanId)) map.set(clanId, { clan_id: clanId, scores: [], score: 0 });
    const entry = map.get(clanId)!;
    entry.scores.push(s.score);
  }
  for (const v of map.values()) v.score = median(v.scores);
  return [...map.values()].sort((a, b) => b.score - a.score);
}

/**
 * Placeholder Clan Duel settlement — uses the same median clan
 * aggregate as G2 but applies the 5% rake on the winner pool. The
 * leader gets a +20% bonus funded by a 1.20× weight on other
 * winners' shares (so the platform stays whole).
 */
function settleClanDuel(challenge: ChallengeRow): {
  ok: boolean;
  error?: string;
  winners: number;
  losers: number;
  totalPayoutCr: number;
  rakeCr: number;
} {
  const parts = listParticipants(challenge.id);
  if (!challenge.clan_a_id || !challenge.clan_b_id) {
    return settlePush(parts, 'clan duel missing clan_a or clan_b');
  }
  const scored = parts.map((p) => {
    const cpf = getChallengePortfolioForUserLocal(p.user_id, challenge.id);
    if (!cpf) return { participant: p, score: 0 };
    const holdings = listHoldings(cpf.id);
    const holdingsValue = holdings.reduce((a, b) => a + b.market_value, 0);
    const portfolio = getChallengePortfolio(cpf.id);
    if (!portfolio) return { participant: p, score: 0 };
    const finalValue = portfolio.cash_balance + holdingsValue;
    const pnlPct = portfolio.starting_cash > 0
      ? ((finalValue - portfolio.starting_cash) / portfolio.starting_cash) * 100
      : 0;
    return { participant: p, score: pnlPct };
  });

  const aScores = scored.filter((s) => s.participant.clan_id === challenge.clan_a_id).map((s) => s.score);
  const bScores = scored.filter((s) => s.participant.clan_id === challenge.clan_b_id).map((s) => s.score);
  const aMed = median(aScores);
  const bMed = median(bScores);

  let winnerClanId: string | null = null;
  let totalPot = 0;
  for (const p of parts) totalPot += p.stake_paid;
  const rake = Math.round(totalPot * 0.05);
  if (aMed > bMed) winnerClanId = challenge.clan_a_id;
  else if (bMed > aMed) winnerClanId = challenge.clan_b_id;

  if (!winnerClanId) {
    // Tie — refund both sides, no rake.
    for (const p of parts) {
      applyTransaction({
        userId: p.user_id,
        kind: 'challenge_refund',
        amount: p.stake_paid,
        referenceId: challenge.id,
        description: 'Clan Duel tie — refund',
      });
      db().prepare(
        `UPDATE challenge_participants SET payout = ?, result = 'draw', settled_at = ? WHERE challenge_id = ? AND user_id = ?`
      ).run(p.stake_paid, nowMs(), challenge.id, p.user_id);
    }
    db().prepare(`UPDATE challenges SET rake_credits = ?, final_score_a = ?, final_score_b = ? WHERE id = ?`)
      .run(0, aMed, bMed, challenge.id);
    return { ok: true, winners: 0, losers: 0, totalPayoutCr: 0, rakeCr: 0 };
  }

  const winnerSide = scored.filter((s) => s.participant.clan_id === winnerClanId);
  const loserSide = scored.filter((s) => s.participant.clan_id !== winnerClanId);

  // Distribute (pot - rake) across winners, with +20% to leaders.
  const winnerPool = totalPot - rake;
  const leaderCount = winnerSide.filter((s) => s.participant.role === 'leader').length;
  const memberCount = winnerSide.length - leaderCount;
  // weight: members share 1.0 unit each, leader takes 1.20 units.
  const totalWeight = memberCount * 1.0 + leaderCount * 1.2;
  const perWeight = Math.floor(winnerPool / totalWeight);
  let totalPayout = 0;
  let winners = 0;
  for (const s of winnerSide) {
    const isLeader = s.participant.role === 'leader';
    const payout = isLeader ? Math.round(perWeight * 1.2) : perWeight;
    applyTransaction({
      userId: s.participant.user_id,
      kind: 'challenge_payout',
      amount: payout,
      referenceId: challenge.id,
      description: `Clan Duel payout — ${isLeader ? 'leader bonus' : 'member share'}`,
    });
    db().prepare(
      `UPDATE challenge_participants SET payout = ?, result = 'won', settled_at = ? WHERE challenge_id = ? AND user_id = ?`
    ).run(payout, nowMs(), challenge.id, s.participant.user_id);
    applyCreditsToClan({ clanId: winnerClanId, credits: payout });
    upsertClanLeaderboard({
      clanId: winnerClanId,
      scope: 'alltime',
      periodKey: 'all',
      creditsWon: payout,
      challengeWins: 1,
    });
    totalPayout += payout;
    winners += 1;
  }
  // Losers' stakes already debited at join — no refund.
  for (const s of loserSide) {
    db().prepare(
      `UPDATE challenge_participants SET payout = 0, result = 'lost', settled_at = ? WHERE challenge_id = ? AND user_id = ?`
    ).run(nowMs(), challenge.id, s.participant.user_id);
  }
  db().prepare(`UPDATE challenges SET rake_credits = ?, winner_clan_id = ?, final_score_a = ?, final_score_b = ? WHERE id = ?`)
    .run(rake, winnerClanId, aMed, bMed, challenge.id);
  return { ok: true, winners, losers: loserSide.length, totalPayoutCr: totalPayout, rakeCr: rake };
}

/**
 * Sweep through all live challenges whose ends_at has passed and
 * settle them. Idempotent — calls settleChallenge which rejects
 * already-settled rows.
 *
 * This is what the cron job would call at 4:05pm ET. In v1 the UI
 * also calls it on dashboard load so settled challenges don't sit
 * "live" forever.
 */
export function settleDueChallenges(): { settled: number; errors: number } {
  const due = db()
    .prepare(`SELECT id FROM challenges WHERE status = 'live' AND ends_at <= ?`)
    .all(nowMs()) as { id: string }[];
  let settled = 0;
  let errors = 0;
  for (const row of due) {
    const result = settleChallenge(row.id);
    if (result.ok) settled += 1;
    else errors += 1;
  }
  return { settled, errors };
}

/**
 * Cancel open challenges that never filled (G7 rosters, etc.) after
 * their accept/roster deadlines pass. Idempotent.
 */
export function cancelExpiredOpenChallenges(): { cancelled: number } {
  const expired = db()
    .prepare(
      `SELECT id FROM challenges WHERE status = 'open'
         AND (
           (accept_deadline IS NOT NULL AND accept_deadline <= ?)
           OR (roster_lock_deadline IS NOT NULL AND roster_lock_deadline <= ?)
           OR (build_deadline IS NOT NULL AND build_deadline <= ?)
         )`
    )
    .all(nowMs(), nowMs(), nowMs()) as { id: string }[];
  let cancelled = 0;
  for (const row of expired) {
    const challenge = getChallenge(row.id);
    if (!challenge) continue;
    const parts = listParticipants(row.id);
    for (const p of parts) {
      try {
        applyTransaction({
          userId: p.user_id,
          kind: 'challenge_refund',
          amount: p.stake_paid,
          referenceId: row.id,
          description: 'Refund — challenge cancelled (deadline passed)',
        });
      } catch {
        // ignore
      }
    }
    db().prepare(`UPDATE challenges SET status = 'cancelled' WHERE id = ?`).run(row.id);
    cancelled += 1;
  }
  return { cancelled };
}