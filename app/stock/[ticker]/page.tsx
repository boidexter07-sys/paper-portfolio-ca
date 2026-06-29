import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getStock, priceHistoryFor } from '@/lib/stocks';
import { listPortfolios, getPortfolioWithHoldings } from '@/lib/portfolio';
import { getCurrentUser } from '@/lib/auth';
import { computePrism } from '@/lib/prism';
import { ChartLineDraw } from '@/components/ChartLineDraw';
import { PrismCardServer } from '@/components/PrismCardServer';
import { PrismSkeleton } from '@/components/PrismSkeleton';
import { TradeButton } from '@/components/TradeButton';
import { PlainScoreCoin } from '@/components/PlainScoreCoin';
import { CountUp } from '@/components/CountUp';
import { FactorExplainerSection } from '@/components/FactorExplainerSection';
import { NewsSentimentServer } from '@/components/NewsSentimentServer';

export default async function StockProfilePage({ params }: { params: { ticker: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const stock = getStock(params.ticker);
  if (!stock) notFound();
  const history = priceHistoryFor(stock.ticker, 180);
  const portfolios = listPortfolios(user.id);
  // The user can sell only if they actually own this ticker in any of their
  // paper portfolios. Disabled Sell button + helper text otherwise.
  const canSell = portfolios.some((p) => {
    const summary = getPortfolioWithHoldings(p.id, user.id);
    return summary?.holdings.some((h) => h.ticker === stock.ticker && h.quantity > 0);
  });

  // Pre-compute the PRISM composite score for the coin (server-side).
  const prism = computePrism(stock.ticker);

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/discover" className="text-caption text-graphite hover:text-ink">← Discover</Link>
          <div className="flex items-baseline gap-3 mt-1">
            <h1 className="font-serif text-h1 sm:text-display text-ink leading-none">{stock.ticker}</h1>
            <p className="text-body-sm text-stone">{stock.exchange} · {stock.sector}</p>
          </div>
          <p className="text-body text-graphite mt-1">{stock.name}</p>
          {stock.description && <p className="text-body-sm text-stone mt-2 max-w-prose">{stock.description}</p>}
        </div>
        <div className="text-right">
          <p className="font-serif text-h1 text-ink pv-num">
            {stock.cached_price ? (
              <CountUp value={stock.cached_price} decimals={2} prefix="$" duration={900} />
            ) : (
              '—'
            )}
          </p>
          <p className="text-caption text-stone">{stock.currency} · last close</p>
        </div>
      </div>

      {/* Plain Score coin (Option A Accent 1) — round embossed hero element */}
      <section className="pv-card p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
        <PlainScoreCoin score={prism.composite_score} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="pv-eyebrow mb-1">Plain score</p>
          <p className="font-serif text-h2 text-ink leading-tight">
            A composite of technical and fundamental signals.
          </p>
          <p className="text-body-sm text-graphite mt-2 max-w-prose">
            PRISM turns public data into a single number so you can read the picture at a glance.
            It is a starting point for learning — not a recommendation.
          </p>
        </div>
      </section>

      {portfolios.length > 0 && stock.cached_price ? (
        <TradeButton ticker={stock.ticker} price={stock.cached_price} portfolios={portfolios} canSell={canSell} />
      ) : (
        <div className="pv-card p-4 text-body-sm text-graphite">
          You need a paper portfolio to trade. <Link href="/portfolio" className="pv-link">Create one →</Link>
        </div>
      )}

      <Suspense fallback={<PrismSkeleton />}>
        <PrismCardServer ticker={stock.ticker} />
      </Suspense>

      <Suspense fallback={<div className="pv-card p-4 text-body-sm text-stone">Loading news & sentiment…</div>}>
        <NewsSentimentServer ticker={stock.ticker} />
      </Suspense>

      <FactorExplainerSection
        indicators={prism.layers.L1_technical.indicators || {}}
        factors={prism.layers.L2_fundamental.factors || {}}
      />

      <section>
        <h2 className="font-serif text-h2 text-ink mb-3">Price, last 6 months</h2>
        {history.length > 0 ? (
          <div className="pv-card p-4">
            <ChartLineDraw data={history} height={260} />
          </div>
        ) : (
          <div className="pv-card p-4 text-body-sm text-stone">No price history available.</div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-h2 text-ink mb-3">A few plain-language numbers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pv-stagger">
          <Stat label="P/E (TTM)" value={stock.cached_pe ? stock.cached_pe.toFixed(1) : '—'} hint="Years of profit you pay for" />
          <Stat label="P/B" value={stock.cached_pb ? stock.cached_pb.toFixed(1) : '—'} hint="Price vs. assets on the books" />
          <Stat label="ROE" value={stock.cached_roe ? `${stock.cached_roe.toFixed(1)}%` : '—'} hint="How efficient the team is" />
          <Stat label="Yield" value={stock.cached_dividend_yield != null ? `${stock.cached_dividend_yield.toFixed(2)}%` : '—'} hint="Income you receive per year" />
        </div>
      </section>

      <div className="text-center pt-2">
        <Link href={`/stock/${stock.ticker}/deep`} className="pv-link text-body-sm">Read the full Plain Score breakdown →</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="pv-card p-3">
      <p className="pv-eyebrow">{label}</p>
      <p className="font-serif text-h2 text-ink pv-num">{value}</p>
      <p className="text-caption text-stone">{hint}</p>
    </div>
  );
}