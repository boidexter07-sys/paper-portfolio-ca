import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getStock } from '@/lib/stocks';
import { PrismCardServer } from '@/components/PrismCardServer';
import { PrismSkeleton } from '@/components/PrismSkeleton';
import { StockDeepServer } from '@/components/StockDeepServer';

export default async function StockDeepPage({ params }: { params: { ticker: string } }) {
  const stock = getStock(params.ticker);
  if (!stock) notFound();

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl">
      <div>
        <Link href={`/stock/${stock.ticker}`} className="text-caption text-graphite hover:text-ink">← Back to {stock.ticker}</Link>
        <h1 className="font-serif text-h1 text-ink mt-1">{stock.ticker} deep dive</h1>
        <p className="text-body-sm text-graphite">How the Plain Score is built, layer by layer.</p>
      </div>

      <Suspense fallback={<PrismSkeleton />}>
        <PrismCardServer ticker={stock.ticker} />
      </Suspense>

      <Suspense fallback={<DeepBodySkeleton />}>
        <StockDeepServer ticker={stock.ticker} />
      </Suspense>
    </div>
  );
}

function DeepBodySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="pv-card animate-pulse divide-y divide-fog">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-fog rounded" />
              <div className="h-3 w-24 bg-fog rounded" />
            </div>
            <div className="h-6 w-12 bg-fog rounded" />
          </div>
        ))}
      </div>
      <div className="pv-card animate-pulse divide-y divide-fog">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-fog rounded" />
              <div className="h-3 w-24 bg-fog rounded" />
            </div>
            <div className="h-6 w-12 bg-fog rounded" />
          </div>
        ))}
      </div>
      <div className="pv-card p-4 animate-pulse">
        <div className="h-40 bg-fog rounded" />
      </div>
      <div className="pv-card p-5 animate-pulse">
        <div className="h-3 w-32 bg-fog rounded mb-3" />
        <div className="h-3 w-full bg-fog rounded" />
        <div className="h-3 w-3/4 bg-fog rounded mt-2" />
      </div>
    </div>
  );
}
