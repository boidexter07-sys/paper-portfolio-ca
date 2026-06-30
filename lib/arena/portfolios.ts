// T42: ARENA challenge portfolios — ephemeral $50K paper portfolios
// created on challenge acceptance. Strictly separated from main
// portfolios (the main `portfolios` table). Each challenge gets its
// own challenge_portfolio row per participant.
//
// Key invariant: once the challenge's ends_at passes, the portfolio
// is READ-ONLY. `buyStock` and `sellStock` reject edits when
// `isReadOnly` returns true.
//
// Settlement: at ends_at, `settleChallengePortfolio` marks-to-market
// against current prices and writes final_value + final_pnl.

import { getDb, uuid } from '../db';
import { getChallenge, type ChallengeRow } from './challenges';

export type ChallengePortfolioRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  cash_balance: number;
  starting_cash: number;
  created_at: number;
  locked_at: number | null;
  final_value: number | null;
  final_pnl: number | null;
};

export type ChallengeHolding = {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  name?: string;
  currency?: string;
};

export const CHALLENGE_PORTFOLIO_STARTING_CASH = 50_000;

function db() {
  return getDb();
}

function nowMs() {
  return Date.now();
}

export function getChallengePortfolio(id: string): ChallengePortfolioRow | null {
  const row = db().prepare('SELECT * FROM challenge_portfolios WHERE id = ?').get(id) as
    | ChallengePortfolioRow
    | undefined;
  return row ?? null;
}

export function getChallengePortfolioForUser(challengeId: string, userId: string): ChallengePortfolioRow | null {
  const row = db()
    .prepare('SELECT * FROM challenge_portfolios WHERE challenge_id = ? AND user_id = ?')
    .get(challengeId, userId) as ChallengePortfolioRow | undefined;
  return row ?? null;
}

export function listUserChallengePortfolios(userId: string, limit = 50): Array<{
  portfolio: ChallengePortfolioRow;
  challenge: ChallengeRow;
  total_value: number;
}> {
  const rows = db()
    .prepare(
      `SELECT cp.*, c.id AS c_id, c.kind, c.name, c.description, c.theme, c.metric, c.roster_size,
              c.stake_free, c.stake_sub, c.multiplier, c.duration_days, c.starts_at, c.ends_at,
              c.status, c.clan_a_id, c.clan_b_id, c.winner_clan_id, c.accept_deadline,
              c.roster_lock_deadline, c.build_deadline, c.created_by, c.created_at AS c_created_at,
              c.settled_at, c.final_score_a, c.final_score_b, c.rake_credits
         FROM challenge_portfolios cp
         JOIN challenges c ON c.id = cp.challenge_id
        WHERE cp.user_id = ?
        ORDER BY cp.created_at DESC
        LIMIT ?`
    )
    .all(userId, limit);
  const out: Array<{ portfolio: ChallengePortfolioRow; challenge: ChallengeRow; total_value: number }> = [];
  for (const r of rows as Array<ChallengePortfolioRow & { c_id: string }>) {
    const challenge = getChallenge(r.c_id);
    if (!challenge) continue;
    const portfolio = getChallengePortfolio(r.id);
    if (!portfolio) continue;
    const holdings = listHoldings(portfolio.id);
    const holdingsValue = holdings.reduce((a, b) => a + b.market_value, 0);
    out.push({ portfolio, challenge, total_value: portfolio.cash_balance + holdingsValue });
  }
  return out;
}

/**
 * Create a challenge portfolio on first accept. Idempotent via UNIQUE
 * (challenge_id, user_id). Returns the portfolio row.
 */
export function createChallengePortfolio(args: {
  challengeId: string;
  userId: string;
}): { ok: true; portfolio: ChallengePortfolioRow } | { ok: false; error: string } {
  const challenge = getChallenge(args.challengeId);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };

  const existing = getChallengePortfolioForUser(args.challengeId, args.userId);
  if (existing) return { ok: true, portfolio: existing };

  const id = uuid();
  const now = nowMs();
  try {
    db().prepare(
      `INSERT INTO challenge_portfolios (id, challenge_id, user_id, cash_balance, starting_cash, created_at, locked_at, final_value, final_pnl)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`
    ).run(id, args.challengeId, args.userId, CHALLENGE_PORTFOLIO_STARTING_CASH, CHALLENGE_PORTFOLIO_STARTING_CASH, now);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not create challenge portfolio.';
    return { ok: false, error: msg };
  }
  const portfolio = getChallengePortfolio(id);
  if (!portfolio) return { ok: false, error: 'Could not load new portfolio.' };
  return { ok: true, portfolio };
}

export function isReadOnly(portfolio: ChallengePortfolioRow, challenge?: ChallengeRow | null): boolean {
  if (portfolio.locked_at) return true;
  const ch = challenge ?? getChallenge(portfolio.challenge_id);
  if (!ch) return true;
  if (ch.status === 'settled' || ch.status === 'cancelled') return true;
  return nowMs() >= ch.ends_at;
}

export function listHoldings(portfolioId: string): ChallengeHolding[] {
  const rows = db()
    .prepare(
      `SELECT h.ticker, h.quantity, h.avg_cost, s.cached_price, s.name, s.currency
         FROM challenge_portfolio_holdings h
         JOIN stocks s ON s.ticker = h.ticker
        WHERE h.challenge_portfolio_id = ?`
    )
    .all(portfolioId) as Array<{
      ticker: string;
      quantity: number;
      avg_cost: number;
      cached_price: number | null;
      name: string;
      currency: string;
    }>;
  return rows.map((r) => {
    const current = r.cached_price ?? r.avg_cost;
    const market_value = r.quantity * current;
    const cost_basis = r.quantity * r.avg_cost;
    const pnl = market_value - cost_basis;
    return {
      ticker: r.ticker,
      quantity: r.quantity,
      avg_cost: r.avg_cost,
      current_price: current,
      market_value,
      cost_basis,
      unrealized_pnl: pnl,
      unrealized_pnl_pct: cost_basis > 0 ? (pnl / cost_basis) * 100 : 0,
      name: r.name,
      currency: r.currency,
    };
  });
}

export function getHoldingsCount(portfolioId: string): number {
  const row = db()
    .prepare('SELECT COUNT(*) AS c FROM challenge_portfolio_holdings WHERE challenge_portfolio_id = ?')
    .get(portfolioId) as { c: number };
  return row.c;
}

/**
 * Buy a stock inside a challenge portfolio. Refuses if the challenge
 * has ended (read-only). Real-time prices per task body — price is
 * the cached_price from the stocks table, refreshed daily.
 */
export function buyStock(args: {
  portfolioId: string;
  ticker: string;
  quantity: number;
}): { ok: true; portfolio: ChallengePortfolioRow } | { ok: false; error: string } {
  const portfolio = getChallengePortfolio(args.portfolioId);
  if (!portfolio) return { ok: false, error: 'Challenge portfolio not found.' };
  const challenge = getChallenge(portfolio.challenge_id);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };
  if (isReadOnly(portfolio, challenge)) {
    return { ok: false, error: 'This challenge portfolio is read-only (challenge has ended).' };
  }
  const stock = db().prepare('SELECT ticker, cached_price FROM stocks WHERE ticker = ?').get(args.ticker.toUpperCase()) as
    | { ticker: string; cached_price: number | null }
    | undefined;
  if (!stock) return { ok: false, error: 'Unknown ticker.' };
  const price = stock.cached_price ?? 0;
  if (price <= 0) return { ok: false, error: 'Price not available for this ticker yet.' };
  if (!Number.isFinite(args.quantity) || args.quantity <= 0) {
    return { ok: false, error: 'Quantity must be positive.' };
  }
  const notional = price * args.quantity;
  if (notional > portfolio.cash_balance + 1e-6) {
    return { ok: false, error: 'Not enough cash in this challenge portfolio.' };
  }

  try {
    const tx = db().transaction(() => {
      const existing = db()
        .prepare(
          'SELECT id, quantity, avg_cost FROM challenge_portfolio_holdings WHERE challenge_portfolio_id = ? AND ticker = ?'
        )
        .get(args.portfolioId, args.ticker.toUpperCase()) as
        | { id: number; quantity: number; avg_cost: number }
        | undefined;
      if (existing) {
        const newQty = existing.quantity + args.quantity;
        const newCost = (existing.quantity * existing.avg_cost + args.quantity * price) / newQty;
        db().prepare('UPDATE challenge_portfolio_holdings SET quantity = ?, avg_cost = ? WHERE id = ?').run(
          newQty,
          newCost,
          existing.id
        );
      } else {
        db().prepare(
          'INSERT INTO challenge_portfolio_holdings (challenge_portfolio_id, ticker, quantity, avg_cost) VALUES (?, ?, ?, ?)'
        ).run(args.portfolioId, args.ticker.toUpperCase(), args.quantity, price);
      }
      db().prepare('UPDATE challenge_portfolios SET cash_balance = cash_balance - ? WHERE id = ?').run(
        notional,
        args.portfolioId
      );
    });
    tx();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Trade failed.';
    return { ok: false, error: msg };
  }
  const refreshed = getChallengePortfolio(args.portfolioId);
  if (!refreshed) return { ok: false, error: 'Portfolio disappeared.' };
  return { ok: true, portfolio: refreshed };
}

export function sellStock(args: {
  portfolioId: string;
  ticker: string;
  quantity: number;
}): { ok: true; portfolio: ChallengePortfolioRow } | { ok: false; error: string } {
  const portfolio = getChallengePortfolio(args.portfolioId);
  if (!portfolio) return { ok: false, error: 'Challenge portfolio not found.' };
  const challenge = getChallenge(portfolio.challenge_id);
  if (!challenge) return { ok: false, error: 'Challenge not found.' };
  if (isReadOnly(portfolio, challenge)) {
    return { ok: false, error: 'This challenge portfolio is read-only (challenge has ended).' };
  }
  const stock = db().prepare('SELECT ticker, cached_price FROM stocks WHERE ticker = ?').get(args.ticker.toUpperCase()) as
    | { ticker: string; cached_price: number | null }
    | undefined;
  if (!stock) return { ok: false, error: 'Unknown ticker.' };
  const price = stock.cached_price ?? 0;
  if (price <= 0) return { ok: false, error: 'Price not available for this ticker yet.' };
  if (!Number.isFinite(args.quantity) || args.quantity <= 0) {
    return { ok: false, error: 'Quantity must be positive.' };
  }
  const existing = db()
    .prepare(
      'SELECT id, quantity FROM challenge_portfolio_holdings WHERE challenge_portfolio_id = ? AND ticker = ?'
    )
    .get(args.portfolioId, args.ticker.toUpperCase()) as { id: number; quantity: number } | undefined;
  if (!existing || existing.quantity < args.quantity) {
    return { ok: false, error: 'You cannot sell more than you own (challenge).' };
  }
  const notional = price * args.quantity;
  try {
    const tx = db().transaction(() => {
      const newQty = existing.quantity - args.quantity;
      if (newQty < 1e-9) {
        db().prepare('DELETE FROM challenge_portfolio_holdings WHERE id = ?').run(existing.id);
      } else {
        db().prepare('UPDATE challenge_portfolio_holdings SET quantity = ? WHERE id = ?').run(newQty, existing.id);
      }
      db().prepare('UPDATE challenge_portfolios SET cash_balance = cash_balance + ? WHERE id = ?').run(
        notional,
        args.portfolioId
      );
    });
    tx();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Trade failed.';
    return { ok: false, error: msg };
  }
  const refreshed = getChallengePortfolio(args.portfolioId);
  if (!refreshed) return { ok: false, error: 'Portfolio disappeared.' };
  return { ok: true, portfolio: refreshed };
}

/**
 * Settle a challenge portfolio: compute final value, mark locked_at,
 * write final_pnl. Idempotent — once locked, calls are no-ops.
 */
export function settleChallengePortfolio(portfolioId: string): { ok: true; finalValue: number; finalPnl: number } | { ok: false; error: string } {
  const portfolio = getChallengePortfolio(portfolioId);
  if (!portfolio) return { ok: false, error: 'Portfolio not found.' };
  if (portfolio.locked_at) {
    return { ok: true, finalValue: portfolio.final_value ?? 0, finalPnl: portfolio.final_pnl ?? 0 };
  }
  const holdings = listHoldings(portfolioId);
  const holdingsValue = holdings.reduce((a, b) => a + b.market_value, 0);
  const finalValue = portfolio.cash_balance + holdingsValue;
  const finalPnl = finalValue - portfolio.starting_cash;
  db().prepare(
    `UPDATE challenge_portfolios SET locked_at = ?, final_value = ?, final_pnl = ? WHERE id = ?`
  ).run(nowMs(), finalValue, finalPnl, portfolioId);
  return { ok: true, finalValue, finalPnl };
}