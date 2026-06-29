// Client-safe news helpers. Mirrors delta7dArrow (from lib/sentiment.ts)
// and sourceLabels (from lib/ingestion.ts) but is importable from
// 'use client' components without dragging the Node-only better-sqlite3
// dependency into the client bundle.
//
// Kept in sync with the lib/sentiment.ts + lib/ingestion.ts copies via
// code review. When the source files change, update this file too.

export type SentimentSourceLabel = 'NewsAPI' | 'GDELT' | 'Reddit' | 'SEC EDGAR';

export const SOURCE_LABELS: Record<'news' | 'gdelt' | 'reddit' | 'filings', SentimentSourceLabel> = {
  news: 'NewsAPI',
  gdelt: 'GDELT',
  reddit: 'Reddit',
  filings: 'SEC EDGAR',
};

export type DeltaArrow = 'up' | 'down' | 'flat';

// Maps a 7-day delta (in score points) to a directional arrow used in the
// UI. Thresholds chosen for legibility — anything within ±5 points reads
// as no meaningful change.
export function delta7dArrowClient(delta: number): DeltaArrow {
  if (delta > 5) return 'up';
  if (delta < -5) return 'down';
  return 'flat';
}
