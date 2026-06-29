// Server-only wrapper for the home page featured signals grid.
// computePrism() can block on a SQLite lock; wrap in <Suspense> so the
// surrounding home shell streams first.

import { computePrism } from '@/lib/prism';
import { HomeFeaturedSignalCard } from './HomeFeaturedSignalCard';

export async function HomeFeaturedSignalsServer({
  tickers,
}: {
  tickers: { ticker: string; name: string; exchange: string }[];
}) {
  const items = tickers.map((s) => ({ stock: s, prism: computePrism(s.ticker) }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pv-stagger">
      {items.map(({ stock, prism }) => (
        <HomeFeaturedSignalCard
          key={stock.ticker}
          ticker={stock.ticker}
          name={stock.name}
          exchange={stock.exchange}
          composite={Math.round(prism.composite_score)}
          signal={prism.signal}
        />
      ))}
    </div>
  );
}