// Portfolio helpers — read/write trades, compute P&L.

import { getDb, uuid } from './db';

export type Holding = {
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

export type PortfolioSummary = {
  id: string;
  name: string;
  style: string;
  created_at: number;
  holdings: Holding[];
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_pct: number;
};

export function listPortfolios(userId: string): { id: string; name: string; style: string }[] {
  return getDb()
    .prepare('SELECT id, name, style FROM portfolios WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId) as { id: string; name: string; style: string }[];
}

export function getPortfolioWithHoldings(portfolioId: string, userId: string): PortfolioSummary | null {
  const db = getDb();
  const p = db.prepare('SELECT id, user_id, name, style, created_at FROM portfolios WHERE id = ? AND user_id = ?').get(portfolioId, userId) as
    | { id: string; user_id: string; name: string; style: string; created_at: number }
    | undefined;
  if (!p) return null;
  const rows = db
    .prepare(
      `SELECT h.ticker, h.quantity, h.avg_cost, s.cached_price, s.name, s.currency
       FROM holdings h
       JOIN stocks s ON s.ticker = h.ticker
       WHERE h.portfolio_id = ?`
    )
    .all(portfolioId) as {
    ticker: string;
    quantity: number;
    avg_cost: number;
    cached_price: number | null;
    name: string;
    currency: string;
  }[];

  const holdings: Holding[] = rows.map((r) => {
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

  const total_value = holdings.reduce((a, b) => a + b.market_value, 0);
  const total_cost = holdings.reduce((a, b) => a + b.cost_basis, 0);
  return {
    id: p.id,
    name: p.name,
    style: p.style,
    created_at: p.created_at,
    holdings,
    total_value,
    total_cost,
    total_pnl: total_value - total_cost,
    total_pnl_pct: total_cost > 0 ? ((total_value - total_cost) / total_cost) * 100 : 0,
  };
}

export function removeHolding(
  userId: string,
  args: { portfolioId: string; ticker: string }
): { ok: boolean; error?: string; removed?: boolean } {
  const db = getDb();
  const port = db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(args.portfolioId, userId) as { id: string } | undefined;
  if (!port) return { ok: false, error: 'Portfolio not found.' };
  const existing = db.prepare('SELECT id FROM holdings WHERE portfolio_id = ? AND ticker = ?').get(args.portfolioId, args.ticker.toUpperCase()) as { id: number } | undefined;
  if (!existing) return { ok: false, error: 'Holding not found.' };
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM holdings WHERE id = ?').run(existing.id);
    // Keep trade history for audit per brief §7 — only zero out the holding.
  });
  try {
    tx();
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not remove holding.' };
  }
  return { ok: true, removed: true };
}

export function saveTrade(
  userId: string,
  args: { portfolioId: string; ticker: string; side: 'buy' | 'sell'; quantity: number; price: number }
): { ok: boolean; error?: string; tradeId?: string } {
  const db = getDb();
  const port = db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(args.portfolioId, userId) as { id: string } | undefined;
  if (!port) return { ok: false, error: 'Portfolio not found.' };
  const stock = db.prepare('SELECT ticker FROM stocks WHERE ticker = ?').get(args.ticker) as { ticker: string } | undefined;
  if (!stock) return { ok: false, error: 'Stock not found.' };

  const tradeId = uuid();
  const tradeDate = Date.now();
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO trades (id, portfolio_id, ticker, side, quantity, price, trade_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(tradeId, args.portfolioId, args.ticker, args.side, args.quantity, args.price, tradeDate);

    const existing = db.prepare('SELECT id, quantity, avg_cost FROM holdings WHERE portfolio_id = ? AND ticker = ?').get(args.portfolioId, args.ticker) as
      | { id: number; quantity: number; avg_cost: number }
      | undefined;

    if (args.side === 'buy') {
      if (existing) {
        const newQty = existing.quantity + args.quantity;
        const newCost = (existing.quantity * existing.avg_cost + args.quantity * args.price) / newQty;
        db.prepare('UPDATE holdings SET quantity = ?, avg_cost = ? WHERE id = ?').run(newQty, newCost, existing.id);
      } else {
        db.prepare('INSERT INTO holdings (portfolio_id, ticker, quantity, avg_cost) VALUES (?, ?, ?, ?)').run(
          args.portfolioId,
          args.ticker,
          args.quantity,
          args.price
        );
      }
    } else {
      // sell
      if (!existing || existing.quantity < args.quantity) {
        throw new Error('You cannot sell more than you own (paper).');
      }
      const newQty = existing.quantity - args.quantity;
      if (newQty < 1e-9) {
        db.prepare('DELETE FROM holdings WHERE id = ?').run(existing.id);
      } else {
        db.prepare('UPDATE holdings SET quantity = ? WHERE id = ?').run(newQty, existing.id);
      }
    }
  });
  try {
    tx();
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Trade failed.' };
  }
  return { ok: true, tradeId };
}
