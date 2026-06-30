import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listPortfolios, getPortfolioWithHoldings } from '@/lib/portfolio';
import { listStocks } from '@/lib/stocks';
import { getDb } from '@/lib/db';
import { HomeFeaturedSignalsServer } from '@/components/HomeFeaturedSignalsServer';
import { HomeFeaturedSignalsSkeleton } from '@/components/HomeFeaturedSignalsSkeleton';
import { CountUp } from '@/components/CountUp';
import { EmbossedNumber } from '@/components/EmbossedNumber';

function formatMoney(n: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}
function formatPct(n: number) {
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

// Note: when the user is NOT signed in, this page returns null and the
// AppShell falls back to its UnauthHome wrapper which renders the
// LandingPage component (with hero, PRISM explainer, sample surfaces,
// glossary, sample PRISM screen, and CTAs — per the T21 brief). This
// page therefore only renders content for authenticated users.

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null; // shell handles unauth

  const portfolios = listPortfolios(user.id);
  const primary = portfolios[0] ? getPortfolioWithHoldings(portfolios[0].id, user.id) : null;

  // Top-of-mind stocks — pick 3 by style match
  const stocks = listStocks();
  const featured = stocks.slice(0, 3);

  // Latest community events
  const events = getDb()
    .prepare('SELECT ticker, event_type, actor_label, detail, created_at FROM community_events ORDER BY created_at DESC LIMIT 6')
    .all() as { ticker: string; event_type: string; actor_label: string; detail: string; created_at: number }[];

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-8 max-w-5xl">
      <header>
        <p className="pv-eyebrow">Good to see you</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">Hello.</h1>
        <p className="text-body text-graphite mt-2 max-w-prose">
          This is a learning tool, not a brokerage. Practice with a paper portfolio, read what the numbers say, and explore plain-language signals.
        </p>
      </header>

      {/* Portfolio summary */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-serif text-h2 text-ink">Your paper portfolio</h2>
          <Link href="/portfolio" className="text-caption text-graphite hover:text-ink">View all →</Link>
        </div>
        {primary ? (
          <div className="pv-card p-4 sm:p-5">
            <div className="flex items-baseline justify-between">
              <div>
                {/* T40: the portfolio name lives on the /portfolio page where
                    it's contextual. The home page is a snapshot — show the
                    headline numbers (total value, cash, P&L) without the
                    stale "TSX Value Sleeve" copy Taha's seen too many times. */}
                <p className="pv-eyebrow">Paper portfolio</p>
                <p className="font-serif text-h1 text-ink pv-num">
                  <CountUp value={primary.total_value} decimals={0} prefix="$" duration={900} />
                </p>
                <p className="text-caption text-stone">
                  Cash <span className="pv-num">${primary.cash_balance.toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span> · invested <span className="pv-num">${(primary.total_value - primary.cash_balance).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span>
                </p>
              </div>
              <div className="text-right">
                {/* Option A Accent 2 — embossed P&L card with inset text-shadow */}
                <p className="font-serif text-h3">
                  <EmbossedNumber value={primary.total_pnl} decimals={0} prefix="$" sign />
                </p>
                <p className="text-caption pv-num">
                  <EmbossedNumber value={primary.total_pnl_pct} decimals={2} suffix="%" sign />
                </p>
              </div>
            </div>
            {primary.holdings.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 pv-stagger-fast">
                {primary.holdings.slice(0, 4).map((h) => (
                  <Link key={h.ticker} href={`/stock/${h.ticker}`} className="flex items-center justify-between p-3 rounded-md bg-fog/50 hover:bg-fog">
                    <span className="font-medium text-ink">{h.ticker}</span>
                    <span className={`text-caption pv-num ${h.unrealized_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>{formatPct(h.unrealized_pnl_pct)}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/portfolio" className="pv-btn-secondary">Open portfolio</Link>
            </div>
          </div>
        ) : (
          <div className="pv-card p-6 text-center">
            <p className="text-body text-graphite mb-3">You haven't made any paper trades yet. Start with one stock you understand.</p>
            <Link href="/discover" className="pv-btn-mark">Browse stocks</Link>
          </div>
        )}
      </section>

      {/* Featured signals — streamed in Suspense so a slow PRISM call
          (e.g. a locked SQLite writer) doesn't block the rest of the page. */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-serif text-h2 text-ink">Plain signals to read today</h2>
          <Link href="/discover" className="text-caption text-graphite hover:text-ink">More →</Link>
        </div>
        <Suspense fallback={<HomeFeaturedSignalsSkeleton />}>
          <HomeFeaturedSignalsServer tickers={featured} />
        </Suspense>
      </section>

      {/* What's moving in plain language */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-serif text-h2 text-ink">What others are doing</h2>
          <Link href="/community" className="text-caption text-graphite hover:text-ink">Open community →</Link>
        </div>
        <div className="pv-card divide-y divide-fog pv-stagger-fast">
          {events.map((e, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-fog flex items-center justify-center text-caption text-stone shrink-0">
                {e.actor_label.split(' ').pop()?.slice(-3) || '·'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-ink">{e.detail}</p>
                <p className="text-caption text-stone">{timeAgo(e.created_at)} · {e.actor_label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plain-language primer — T27b: rewritten to match the lead+subline
          pattern shipped in components/LandingPage.tsx (T26a/T27a). The old
          "made by a computer" framing has been moved out of explainer copy;
          the honest-about-limits caveat lives in lib/disclosures.ts. */}
      <section>
        <div className="pv-card p-5 sm:p-6">
          <p className="pv-eyebrow mb-2">A note about PRISM signals</p>
          <h3 className="font-serif text-h3 text-ink leading-snug max-w-prose">
            PRISM is a model that scores every stock from 0 to 100. It reads the same public data a serious investor would and turns it into one number you can act on.
          </h3>
          <p className="text-body text-graphite mt-2 max-w-prose">
            A higher score means more factors lined up in the stock&apos;s favour. A lower score means more headwinds. The number is a starting point — your judgment comes next.
          </p>
          <Link href="/learn" className="mt-3 inline-block text-body-sm text-mark underline">Read the explainer →</Link>
        </div>
      </section>
    </div>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}