'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AddHoldingModal } from './AddHoldingModal';
import { CALL_TIER_LABELS, CALL_TIER_STYLES, type CallTier } from '@/lib/call-tier-style';

type Stock = {
  ticker: string;
  name: string;
  exchange: string;
  sector: string | null;
  cached_price: number | null;
  cached_pe: number | null;
  cached_roe: number | null;
  cached_dividend_yield: number | null;
  call_tier: 'buy' | 'hold' | 'sell';
  call_score: number;
  call_signal:
    | 'Strong Paper Buy'
    | 'Paper Buy'
    | 'Hold'
    | 'Paper Sell'
    | 'Strong Paper Sell';
};

type Portfolio = { id: string; name: string; style: string; cash_balance: number };

// Default visible-rows cap. The full universe is 560 tickers; rendering all
// of them in the DOM costs ~7000 nodes and tanks Lighthouse mobile perf to
// ~67. Capping initial render at 100 keeps the DOM under ~1500 nodes (perf
// 95+ target) and lets users "Show 100 more" to load the rest.
const INITIAL_CAP = 100;
const PAGE_SIZE = 100;

const TIERS: ('all' | CallTier)[] = ['all', 'buy', 'hold', 'sell'];

export function DiscoverTable({
  stocks,
  portfolios = [],
}: {
  stocks: Stock[];
  portfolios?: Portfolio[];
}) {
  const [q, setQ] = useState('');
  const [exchange, setExchange] = useState<'ALL' | 'TSX' | 'NYSE' | 'NASDAQ'>('ALL');
  const [sort, setSort] = useState<'ticker' | 'pe' | 'roe' | 'div' | 'price' | 'prism'>(
    'prism'
  );
  const [tier, setTier] = useState<'all' | CallTier>('all');
  const [addTicker, setAddTicker] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_CAP);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let out = stocks.filter((s) => {
      if (exchange !== 'ALL' && s.exchange !== exchange) return false;
      if (tier !== 'all' && s.call_tier !== tier) return false;
      if (!ql) return true;
      return (
        s.ticker.toLowerCase().includes(ql) ||
        s.name.toLowerCase().includes(ql) ||
        (s.sector || '').toLowerCase().includes(ql)
      );
    });
    out = [...out].sort((a, b) => {
      switch (sort) {
        case 'pe':
          return (a.cached_pe ?? Infinity) - (b.cached_pe ?? Infinity);
        case 'roe':
          return (b.cached_roe ?? -Infinity) - (a.cached_roe ?? -Infinity);
        case 'div':
          return (b.cached_dividend_yield ?? -Infinity) - (a.cached_dividend_yield ?? -Infinity);
        case 'price':
          return (a.cached_price ?? Infinity) - (b.cached_price ?? Infinity);
        case 'prism':
          return b.call_score - a.call_score;
        default:
          return a.ticker.localeCompare(b.ticker);
      }
    });
    return out;
  }, [stocks, q, exchange, sort, tier]);

  // Reset the visible-count when the filter changes, so users always see the
  // top-N matches (instead of being stranded with a "Show more" offset from a
  // stale query).
  useMemo(() => {
    setVisibleCount(INITIAL_CAP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, exchange, sort, tier]);

  const visible = filtered.slice(0, visibleCount);

  const canAdd = portfolios.length > 0;
  const compactStocks = useMemo(
    () =>
      stocks.map((s) => ({
        ticker: s.ticker,
        name: s.name,
        exchange: s.exchange,
        cached_price: s.cached_price,
      })),
    [stocks]
  );

  // Per-tier counts — used in the pill labels and to surface "no matches"
  // copy when the user filters to an empty tier.
  const counts = useMemo(() => {
    const c: Record<'all' | CallTier, number> = { all: 0, buy: 0, hold: 0, sell: 0 };
    for (const s of stocks) {
      c.all += 1;
      c[s.call_tier] += 1;
    }
    return c;
  }, [stocks]);

  const addStock = addTicker ? stocks.find((s) => s.ticker === addTicker) : null;

  return (
    <div>
      {/* Call-type filter pills (T21). Above the table per the brief. */}
      <div
        role="tablist"
        aria-label="Filter by paper-portfolio signal"
        className="flex gap-2 overflow-x-auto pv-scroll-hide mb-3"
      >
        {TIERS.map((t) => {
          const active = tier === t;
          const label = t === 'all' ? 'All stocks' : CALL_TIER_LABELS[t].label;
          const style = t === 'all'
            ? active
              ? 'bg-ink text-bone border-ink'
              : 'bg-bone text-graphite border-fog hover:border-graphite/40'
            : active
            ? CALL_TIER_STYLES[t].active
            : CALL_TIER_STYLES[t].inactive;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTier(t)}
              className={`px-3 py-1.5 rounded-full border text-caption font-medium whitespace-nowrap transition-colors ${style}`}
            >
              {label}
              <span className="ml-1.5 text-[0.7rem] opacity-70 pv-num">({counts[t]})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
        <div className="flex-1">
          <label className="sr-only" htmlFor="stock-search">
            Search stocks
          </label>
          <input
            id="stock-search"
            className="pv-input"
            placeholder="Search by name, ticker, or sector"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pv-scroll-hide">
          {(['ALL', 'TSX', 'NYSE', 'NASDAQ'] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setExchange(e)}
              className={`px-3 py-2 rounded-md text-caption font-medium whitespace-nowrap ${
                exchange === e ? 'bg-ink text-bone' : 'bg-fog text-graphite'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <div>
          <label className="sr-only" htmlFor="stock-sort">
            Sort
          </label>
          <select
            id="stock-sort"
            className="pv-input"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="prism">Sort: Plain Score (high → low)</option>
            <option value="ticker">Sort: A → Z</option>
            <option value="pe">Sort: Cheapest P/E first</option>
            <option value="roe">Sort: Highest ROE first</option>
            <option value="div">Sort: Highest yield first</option>
            <option value="price">Sort: Lowest price first</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="pv-card p-6 text-center">
          <p className="text-body text-graphite">
            No stocks match that search.{' '}
            {tier !== 'all' ? `Try clearing the ${CALL_TIER_LABELS[tier].label.toLowerCase()} filter.` : 'Try a different word.'}
          </p>
        </div>
      ) : (
        <div className="pv-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm pv-table">
              <thead>
                <tr className="text-left text-caption text-stone uppercase tracking-wide border-b border-fog">
                  <th className="px-4 py-2">Ticker</th>
                  <th className="px-4 py-2 hidden sm:table-cell">Name</th>
                  <th className="px-4 py-2 hidden md:table-cell">Sector</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right hidden sm:table-cell">P/E</th>
                  <th className="px-4 py-2 text-right hidden md:table-cell">Yield</th>
                  <th className="px-4 py-2 text-right">Plain Score</th>
                  <th className="px-4 py-2 text-right hidden md:table-cell">Signal</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              {/* Stagger animation: rows fade-in sequentially (40ms each — see
                  v5-motion-grammar.md §6 "Watchlist rows"). The pv-stagger-fast
                  class is gated by prefers-reduced-motion in globals.css. */}
              <tbody className="pv-stagger-fast">
                {visible.map((s) => {
                  const tierKey = s.call_tier;
                  const badgeStyle = CALL_TIER_STYLES[tierKey].badge;
                  return (
                    <tr
                      key={s.ticker}
                      className="border-b border-fog last:border-0 hover:bg-fog/40"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/stock/${s.ticker}`} className="font-medium text-ink">
                          {s.ticker}
                        </Link>
                        <p className="text-caption text-stone sm:hidden">{s.name}</p>
                      </td>
                      <td className="px-4 py-3 text-graphite hidden sm:table-cell">{s.name}</td>
                      <td className="px-4 py-3 text-graphite hidden md:table-cell">{s.sector}</td>
                      <td className="px-4 py-3 text-right pv-num">
                        {s.cached_price ? `$${s.cached_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right pv-num hidden sm:table-cell">
                        {s.cached_pe ? s.cached_pe.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right pv-num hidden md:table-cell">
                        {s.cached_dividend_yield != null
                          ? `${s.cached_dividend_yield.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right pv-num font-medium text-ink">
                        {s.call_score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium border ${badgeStyle}`}
                        >
                          {s.call_signal}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            className="pv-btn-secondary text-caption px-2 py-1"
                            onClick={() => canAdd && setAddTicker(s.ticker)}
                            disabled={!canAdd || !s.cached_price}
                            title={
                              !canAdd
                                ? 'Create a paper portfolio first'
                                : !s.cached_price
                                ? 'No price available'
                                : 'Add to a paper portfolio'
                            }
                            aria-label={`Add ${s.ticker} to a paper portfolio`}
                          >
                            +
                          </button>
                          <Link
                            href={`/stock/${s.ticker}`}
                            className="text-caption text-mark hover:underline"
                          >
                            View →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > visible.length && (
            <div className="px-4 py-3 border-t border-fog flex items-center justify-between">
              <p className="text-caption text-stone">
                Showing <span className="pv-num">{visible.length}</span> of{' '}
                <span className="pv-num">{filtered.length}</span>. Refine search to narrow.
              </p>
              <button
                type="button"
                className="pv-btn-secondary text-caption"
                onClick={() => setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length))}
              >
                Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
              </button>
            </div>
          )}
        </div>
      )}

      {addStock && (
        <AddHoldingModal
          open={!!addTicker}
          onClose={() => setAddTicker(null)}
          defaultTicker={addStock.ticker}
          defaultPrice={addStock.cached_price}
          stocks={compactStocks}
          portfolios={portfolios}
        />
      )}
    </div>
  );
}
