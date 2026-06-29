// Per-request tier cache.
//
// PRISM is now O(N) per call (10 L1 + 12 L2 sub-scores, plus price-history
// math). For /discover's 560-row table we don't want to compute 560 PRISM
// scores more than once per request — and we definitely don't want to
// recompute one stock when it shows up both in Hot Picks and the table.
//
// We memoize the entire computePrism() result via a module-level Map.
// Next.js dev mode reuses the module across renders within the same
// request; production builds hit the cache for every duplicate fetch.
//
// Invalidation: in-memory only, cleared on process restart. For the
// prototype this is fine — the underlying data is deterministic + the
// score changes only when price_history rows change.

import { computePrism, type PrismResult, signalToCallTier } from './prism';

const TIER_CACHE = new Map<string, PrismResult>();

export function getPrismCached(ticker: string): PrismResult {
  const upper = ticker.toUpperCase();
  const hit = TIER_CACHE.get(upper);
  if (hit) return hit;
  const fresh = computePrism(upper);
  TIER_CACHE.set(upper, fresh);
  return fresh;
}

export function tierFor(ticker: string): {
  composite: number;
  tier: 'buy' | 'hold' | 'sell';
  signal: PrismResult['signal'];
} {
  const p = getPrismCached(ticker);
  return {
    composite: p.composite_score,
    tier: signalToCallTier(p.signal),
    signal: p.signal,
  };
}
