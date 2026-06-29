import { getDb } from './db';
import { tierFor } from './tier-cache';

export type StockSummary = {
  ticker: string;
  name: string;
  exchange: string;
  sector: string | null;
  currency: string;
  cached_price: number | null;
  cached_pe: number | null;
  cached_pb: number | null;
  cached_roe: number | null;
  cached_dividend_yield: number | null;
  cached_52w_high: number | null;
  cached_52w_low: number | null;
  description: string | null;
};

// Slim payload used by the Discover table — drops columns never rendered
// (description, cached_pb, 52w high/low, currency). For the full universe
// of 560 stocks this saves ~50% of the SSR flight payload — without it
// Lighthouse mobile /discover drops to ~65 because the HTML doc carries
// every row's description string.
//
// T21: also carries PRISM tier + composite score per row so the
// call-type filter can run client-side without re-computing 560 PRISM
// scores in the browser. Server computes once via tier-cache.
export type StockSlim = {
  ticker: string;
  name: string;
  exchange: string;
  sector: string | null;
  cached_price: number | null;
  cached_pe: number | null;
  cached_roe: number | null;
  cached_dividend_yield: number | null;
  call_tier: 'buy' | 'hold' | 'sell';
  call_score: number; // PRISM composite, 0-100, one decimal
  call_signal: 'Strong Paper Buy' | 'Paper Buy' | 'Hold' | 'Paper Sell' | 'Strong Paper Sell';
};

export function listStocks(): StockSummary[] {
  return getDb()
    .prepare(
      `SELECT ticker, name, exchange, sector, currency,
              cached_price, cached_pe, cached_pb, cached_roe,
              cached_dividend_yield, cached_52w_high, cached_52w_low, description
       FROM stocks ORDER BY exchange, ticker`
    )
    .all() as StockSummary[];
}

// Slim payload used by /discover: 8 SQL columns plus PRISM tier/score
// computed once (per-ticker memoized via lib/tier-cache). For 560
// stocks the full computePrism() round-trip in this method takes
// ~100-150ms in dev mode (uncached) and hits the cache in production.
//
// Compose the slim rows from the SQL fetch + an in-process tier lookup,
// NOT a join, because PRISM lives in TypeScript not SQL.
export function listDiscoverStocks(): StockSlim[] {
  const rows = getDb()
    .prepare(
      `SELECT ticker, name, exchange, sector,
              cached_price, cached_pe, cached_roe, cached_dividend_yield
       FROM stocks ORDER BY exchange, ticker`
    )
    .all() as Omit<StockSlim, 'call_tier' | 'call_score' | 'call_signal'>[];
  return rows.map((r) => {
    const t = tierFor(r.ticker);
    return {
      ...r,
      call_tier: t.tier,
      call_score: t.composite,
      call_signal: t.signal,
    };
  });
}

export function getStock(ticker: string): StockSummary | null {
  return (
    (getDb()
      .prepare(
        `SELECT ticker, name, exchange, sector, currency,
                cached_price, cached_pe, cached_pb, cached_roe,
                cached_dividend_yield, cached_52w_high, cached_52w_low, description
         FROM stocks WHERE ticker = ?`
      )
      .get(ticker.toUpperCase()) as StockSummary | undefined) ?? null
  );
}

export function priceHistoryFor(ticker: string, days = 180): { date: string; close: number }[] {
  return getDb()
    .prepare('SELECT date, close FROM price_history WHERE ticker = ? ORDER BY date DESC LIMIT ?')
    .all(ticker.toUpperCase(), days)
    .reverse() as { date: string; close: number }[];
}
