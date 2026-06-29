// Server-only wrapper that fetches the PRISM result and renders PrismCard.
// Wrapped in <Suspense> on the consumer page so a slow computePrism() (e.g. a
// locked SQLite writer) does not block the rest of the page from streaming.

import { computePrism } from '@/lib/prism';
import { PrismCard } from './PrismCard';

export async function PrismCardServer({
  ticker,
  compact = false,
}: {
  ticker: string;
  compact?: boolean;
}) {
  const prism = computePrism(ticker);
  return <PrismCard prism={prism} compact={compact} />;
}
