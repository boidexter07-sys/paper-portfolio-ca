import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listPortfolios, getPortfolioWithHoldings } from '@/lib/portfolio';
import { listStocks } from '@/lib/stocks';
import { PAPER_ONLY_SAFETY } from '@/lib/disclosures';
import { TRIAL_DAYS, SUBSCRIPTION_PRICE_CAD } from '@/lib/constants';
import { PortfolioHoldingsClient } from '@/components/PortfolioHoldingsClient';
import { CountUp } from '@/components/CountUp';
import { EmbossedNumber } from '@/components/EmbossedNumber';

function money(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}
function pct(n: number) {
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

// Top-level totals (cheap, no per-holding detail fetch) — rendered immediately.
async function PortfolioTotals() {
  const user = await getCurrentUser();
  if (!user) return null;
  const portfolios = listPortfolios(user.id);
  const summaries = portfolios.map((p) => getPortfolioWithHoldings(p.id, user.id)).filter((x): x is NonNullable<typeof x> => x != null);
  const totalValue = summaries.reduce((a, s) => a + s.total_value, 0);
  const totalCost = summaries.reduce((a, s) => a + s.total_cost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  return (
    <div className="pv-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="pv-eyebrow">Total paper value</p>
          <p className="font-serif text-h1 text-ink pv-num">
            <CountUp value={totalValue} decimals={0} prefix="$" duration={900} />
          </p>
        </div>
        <div className="text-right">
          {/* Option A Accent 2 — embossed P&L number, color-tinted inset shadow */}
          <p className="font-serif text-h2">
            <EmbossedNumber value={totalPnl} decimals={0} prefix="$" sign />
          </p>
          <p className="text-caption pv-num">
            <EmbossedNumber value={totalPnlPct} decimals={2} suffix="%" sign />
          </p>
        </div>
      </div>
    </div>
  );
}

// Streaming section: per-portfolio holdings tables + add/remove UI.
// Wrapped in Suspense so the page header renders first even when SQLite is locked.
async function PortfolioHoldingsStream() {
  const user = await getCurrentUser();
  if (!user) return null;
  const portfolios = listPortfolios(user.id);
  const summaries = portfolios.map((p) => getPortfolioWithHoldings(p.id, user.id)).filter((x): x is NonNullable<typeof x> => x != null);
  const stocks = listStocks().map((s) => ({
    ticker: s.ticker,
    name: s.name,
    exchange: s.exchange,
    cached_price: s.cached_price,
  }));
  return <PortfolioHoldingsClient summaries={summaries} stocks={stocks} />;
}

export default function PortfolioPage() {
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl">
      <header>
        <p className="pv-eyebrow">Your paper portfolios</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">Portfolio</h1>
        <p className="text-body text-graphite mt-1 max-w-prose">
          {PAPER_ONLY_SAFETY.pnlLabel}. After your {TRIAL_DAYS}-day trial, you can keep your portfolio with a <span className="pv-num">${SUBSCRIPTION_PRICE_CAD.toFixed(2)} CAD</span>/mo subscription.
        </p>
      </header>

      <Suspense fallback={<PortfolioTotalsSkeleton />}>
        <PortfolioTotals />
      </Suspense>

      <Suspense fallback={<PortfolioHoldingsSkeleton />}>
        <PortfolioHoldingsStream />
      </Suspense>
    </div>
  );
}

function PortfolioTotalsSkeleton() {
  return (
    <div className="pv-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-32 bg-fog rounded pv-shimmer" />
          <div className="h-10 w-40 bg-fog rounded pv-shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-24 bg-fog rounded pv-shimmer" />
          <div className="h-3 w-16 bg-fog rounded pv-shimmer" />
        </div>
      </div>
    </div>
  );
}

function PortfolioHoldingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="pv-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div className="h-6 w-40 bg-fog rounded pv-shimmer" />
          <div className="h-5 w-16 bg-fog rounded-full pv-shimmer" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-fog last:border-0">
            <div className="h-4 w-16 bg-fog rounded pv-shimmer" />
            <div className="h-4 w-20 bg-fog rounded pv-shimmer" />
            <div className="h-4 w-20 bg-fog rounded pv-shimmer" />
            <div className="h-4 w-20 bg-fog rounded pv-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}