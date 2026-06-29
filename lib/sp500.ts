// app/lib/sp500.ts
//
// Client-side helper for the Stock Discovery search box.
//
// The 503 S&P 500 + 60 TSX 60 universe (560 unique tickers as of June 2026)
// is loaded into the local SQLite DB by `prism/load_universe.py` and surfaced
// via `listStocks()` in `lib/stocks.ts`. This module is a thin wrapper that
// provides prefix + substring matching, a single-ticker lookup, and a few
// metadata constants.
//
// The default caller is the `/discover` page's client-side filter
// (see `components/DiscoverTable.tsx`). Both the helper and the page can use
// this module interchangeably.

import { listStocks, getStock } from './stocks';

export type SearchResult = {
  ticker: string;
  name: string;
  exchange: string;
  sector: string | null;
  currency: string;
  cached_price: number | null;
  match_score: number; // higher = better match
};

export type UniverseSummary = {
  total: number;
  by_exchange: Record<string, number>;
  by_sector: Record<string, number>;
  generated_at: string; // ISO timestamp of the underlying listStocks call
};

let cached_universe: ReturnType<typeof listStocks> | null = null;

/** Lazy-load and cache the full universe list. */
function universe() {
  if (cached_universe === null) {
    cached_universe = listStocks();
  }
  return cached_universe;
}

/**
 * Search the universe by ticker prefix, ticker substring, company name, or
 * sector. Returns the top `limit` results, ordered by `match_score` (higher is
 * better — exact ticker match scores highest, then prefix, then substring, then
 * name match, then sector match).
 */
export function searchTickers(query: string, limit = 25): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const all = universe();
  const results: SearchResult[] = [];

  for (const s of all) {
    const ticker = s.ticker.toLowerCase();
    const name = (s.name || '').toLowerCase();
    const sector = (s.sector || '').toLowerCase();

    // Score (higher = better).
    let score = 0;
    if (ticker === q) {
      score = 100; // exact ticker match
    } else if (ticker.startsWith(q)) {
      score = 80; // ticker prefix
    } else if (ticker.includes(q)) {
      score = 60; // ticker substring
    } else if (name.startsWith(q)) {
      score = 50; // name prefix
    } else if (name.includes(q)) {
      score = 40; // name substring
    } else if (sector.includes(q)) {
      score = 20; // sector match
    } else {
      continue;
    }

    results.push({
      ticker: s.ticker,
      name: s.name,
      exchange: s.exchange,
      sector: s.sector,
      currency: s.currency,
      cached_price: s.cached_price,
      match_score: score,
    });
  }

  // Stable sort: score desc, then ticker asc.
  results.sort((a, b) => {
    if (a.match_score !== b.match_score) return b.match_score - a.match_score;
    return a.ticker.localeCompare(b.ticker);
  });

  return results.slice(0, limit);
}

/** Single-ticker lookup. Returns the same shape as the row from listStocks(). */
export function getTicker(ticker: string) {
  return getStock(ticker);
}

/** Full-universe list. Use sparingly — prefer searchTickers(). */
export function listUniverse() {
  return universe();
}

/** Stats: how many tickers, exchange + sector breakdown. */
export function universeSummary(): UniverseSummary {
  const all = universe();
  const by_exchange: Record<string, number> = {};
  const by_sector: Record<string, number> = {};
  for (const s of all) {
    by_exchange[s.exchange] = (by_exchange[s.exchange] || 0) + 1;
    const sec = s.sector || 'Unknown';
    by_sector[sec] = (by_sector[sec] || 0) + 1;
  }
  return {
    total: all.length,
    by_exchange,
    by_sector,
    generated_at: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Constants used by the UI for the discover page
// ----------------------------------------------------------------------------

/** Universe-level facts displayed in tooltips. */
export const UNIVERSE_FACTS = {
  total_tickers: 1210,                  // 1,003 Russell 1000 + 220 TSX Composite − 13 dual-listed
  russell1000_count: 1003,
  tsxcomposite_count: 220,
  dual_listed: 13,                      // names that appear in both Russell 1000 and TSX Composite lists
  fetched_at: '2026-06-28',            // approximate; refresh with each load
  source: 'Wikipedia Russell 1000 Index + S&P/TSX Composite Index (June 2026)',
} as const;