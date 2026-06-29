// Server-rendered Hot Picks strip — top 10 stocks in the "buy" tier by
// PRISM composite score. Lives at the top of /discover (NOT /, per
// T21 brief). Plain-language labels only; no "buy now" / "buy now!"
// directive copy.
//
// Performance: the call-tier for each stock is memoized via tier-cache,
// so rendering both Hot Picks AND the discover table below reuses the
// same per-request computePrism() result.

import Link from 'next/link';
import { listDiscoverStocks } from '@/lib/stocks';
import { tierFor } from '@/lib/tier-cache';
import { PulseBadge } from './PulseBadge';
import { CountUp } from './CountUp';

type Pick = {
  ticker: string;
  name: string;
  exchange: string;
  price: number | null;
  composite: number;
  signal: 'Strong Paper Buy' | 'Paper Buy' | 'Hold' | 'Paper Sell' | 'Strong Paper Sell';
};

export async function HotPicks({ limit = 10 }: { limit?: number }) {
  const slim = listDiscoverStocks();
  const picks: Pick[] = [];

  for (const s of slim) {
    const t = tierFor(s.ticker);
    if (t.tier !== 'buy') continue;
    picks.push({
      ticker: s.ticker,
      name: s.name,
      exchange: s.exchange,
      price: s.cached_price,
      composite: t.composite,
      signal: t.signal,
    });
  }

  picks.sort((a, b) => b.composite - a.composite);
  const top = picks.slice(0, limit);

  if (top.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="hot-picks-heading">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="pv-eyebrow">Hot picks today</p>
          <h2 id="hot-picks-heading" className="font-serif text-h2 text-ink leading-tight">
            Most attractive for a paper portfolio
          </h2>
        </div>
        <Link href="/discover?tier=buy" className="text-caption text-graphite hover:text-ink">
          All buy signals →
        </Link>
      </div>

      <ol
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pv-stagger"
        aria-label="Top 10 buy-tier stocks by Plain Score"
      >
        {top.map((p, idx) => (
          <li key={p.ticker}>
            <Link
              href={`/stock/${p.ticker}`}
              className="block pv-card p-4 hover:border-mist focus:outline-none focus:ring-2 focus:ring-mark"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-caption text-stone">#{idx + 1} · {p.exchange}</p>
                  <p className="font-medium text-ink leading-tight truncate">{p.ticker}</p>
                  <p className="text-caption text-stone truncate">{p.name}</p>
                </div>
                <PulseBadge ticker={p.ticker} tier={p.signal}>
                  <div className="px-2 py-1 rounded-full text-caption font-medium bg-positive/10 text-positive border border-positive/30 whitespace-nowrap">
                    {p.signal}
                  </div>
                </PulseBadge>
              </div>
              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-fog">
                <p className="text-body-sm pv-num text-ink">
                  {p.price != null ? `$${p.price.toFixed(2)}` : '—'}
                </p>
                <p className="font-serif text-h3 text-ink pv-num leading-none">
                  <CountUp value={p.composite} duration={700} suffix="" />
                  <span className="text-caption text-stone font-sans"> / 100</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <p className="text-caption text-stone mt-3 max-w-prose">
        Hot picks are paper-portfolio signals only. PRISM suggests these tickers deserve a closer look — it is a starting point, not a recommendation.
      </p>
    </section>
  );
}
