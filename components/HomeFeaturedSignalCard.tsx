'use client';

// HomeFeaturedSignalCard — client wrapper that animates the Plain Score
// (count-up) on the home dashboard's "Plain signals to read today" tile.

import Link from 'next/link';
import { CountUp } from './CountUp';

export function HomeFeaturedSignalCard({
  ticker,
  name,
  exchange,
  composite,
  signal,
}: {
  ticker: string;
  name: string;
  exchange: string;
  composite: number;
  signal: string;
}) {
  return (
    <Link href={`/stock/${ticker}`} className="block">
      <div className="pv-card p-4 hover:border-mist transition-colors">
        <div className="flex items-baseline justify-between">
          <p className="font-serif text-h3 text-ink">{ticker}</p>
          <p className="text-caption text-stone">{exchange}</p>
        </div>
        <p className="text-body-sm text-graphite mb-3">{name}</p>
        <div className="flex items-baseline gap-3">
          <p className="font-serif text-h2 text-ink pv-num">
            <CountUp value={composite} duration={900} />
          </p>
          <p className="text-caption text-stone">/ 100 · {signal}</p>
        </div>
      </div>
    </Link>
  );
}