// NewsSentimentServer — fetches the cached L3 sentiment for a ticker and
// renders NewsSentimentCard. Mirrors the PrismCardServer pattern: server
// component, suitable for <Suspense>.
//
// Triggers a best-effort background refresh on first load (fire-and-forget)
// so the next visit has fresher data. Caps work with a 2-second budget to
// stay out of the hot path.

import { readSentimentMeta, readRecentHeadlines } from '@/lib/sentiment';
import { NewsSentimentCard } from './NewsSentimentCard';
import { isStale, refreshForTicker } from '@/lib/ingestion';

const BG_REFRESH_BUDGET_MS = 2_000;

export async function NewsSentimentServer({ ticker }: { ticker: string }) {
  // Fire-and-forget refresh if cache is stale. Capped so we never block.
  if (isStale(ticker)) {
    Promise.race([
      refreshForTicker(ticker),
      new Promise((r) => setTimeout(r, BG_REFRESH_BUDGET_MS)),
    ]).catch(() => undefined);
  }
  const sentiment = readSentimentMeta(ticker);
  const headlines = readRecentHeadlines(ticker, 3);
  return <NewsSentimentCard ticker={ticker} sentiment={sentiment} headlines={headlines} />;
}
