'use client';

// NewsSentimentCard — PRISM L3 layer display on /stock/[ticker].
//
// Plain-English: shows the composite sentiment score (0-100, same scale as
// L1+L2), a 7-day delta arrow, the top 3 most recent headlines (each
// clickable to the source URL), and a summary line ("bullish — 73").
//
// Designed to match the existing PrismCard visual vocabulary:
// * pv-card / pv-eyebrow / pv-num
// * green/red/grey chips for source badges
// * serif numerals via CountUp
//
// L3 is best-effort: if no cached data exists yet (cold cache, no API
// keys), shows an honest empty state that points to the offline seed.

import { CountUp } from './CountUp';
import type { RecentHeadline, CompositeSentiment } from '@/lib/sentiment';
import { delta7dArrowClient as delta7dArrow, SOURCE_LABELS as sourceLabels } from '@/lib/news-helpers';

type SentimentSource = 'news' | 'gdelt' | 'reddit' | 'filings';

const SOURCE_COLORS: Record<SentimentSource, string> = {
  news: 'bg-positive/10 text-positive border-positive/20',
  gdelt: 'bg-fog text-graphite border-mist',
  reddit: 'bg-warn/10 text-warn border-warn/20',
  filings: 'bg-fog text-graphite border-mist',
};

const SOURCE_LABEL_OVERRIDES: Record<SentimentSource, string> = {
  ...sourceLabels,
  // Slightly shorter labels for the chip — fits the visual rhythm.
  gdelt: 'GDELT',
};

export function NewsSentimentCard({
  ticker,
  sentiment,
  headlines,
}: {
  ticker: string;
  sentiment: CompositeSentiment | null;
  headlines: RecentHeadline[];
}) {
  if (!sentiment || sentiment.headline_count === 0) {
    return (
      <div className="pv-card p-4 sm:p-5">
        <p className="pv-eyebrow">News & sentiment</p>
        <p className="mt-2 text-body text-graphite">
          We don't have any cached news or sentiment for {ticker} yet.
        </p>
        <p className="mt-2 text-body-sm text-stone">
          Run the seed script (<code className="text-caption bg-fog px-1 py-0.5 rounded">npm run seed:l3</code>)
          for offline demo data, or set a <code className="text-caption bg-fog px-1 py-0.5 rounded">NEWS_API_KEY</code> and
          let the cron pull live stories.
        </p>
      </div>
    );
  }
  const arrow = delta7dArrow(sentiment.delta_7d);
  const arrowColor =
    arrow === 'up' ? 'text-positive' :
    arrow === 'down' ? 'text-negative' : 'text-stone';
  const arrowGlyph =
    arrow === 'up' ? '▲' :
    arrow === 'down' ? '▼' : '—';
  const tierLabel =
    sentiment.composite >= 75 ? 'Very bullish' :
    sentiment.composite >= 60 ? 'Bullish' :
    sentiment.composite >= 45 ? 'Neutral' :
    sentiment.composite >= 30 ? 'Bearish' :
    'Very bearish';
  const tierColor =
    sentiment.composite >= 60 ? 'text-positive' :
    sentiment.composite >= 45 ? 'text-graphite' :
    sentiment.composite >= 30 ? 'text-warn' : 'text-negative';
  return (
    <div className="pv-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="pv-eyebrow">News & sentiment</p>
          <p className={`mt-1 font-serif text-display pv-num leading-none ${tierColor}`}>
            <CountUp value={sentiment.composite} duration={900} suffix="" />
          </p>
          <p className={`mt-2 text-body-sm ${arrowColor} pv-num`}>
            {arrowGlyph} {arrow === 'flat' ? '±0' : Math.abs(Math.round(sentiment.delta_7d))} pts vs 7d ago
            <span className="ml-2 text-stone">· {tierLabel}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="pv-eyebrow">Sources</p>
          <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
            {sentiment.sources.map((s) => (
              <span
                key={s}
                className={`text-caption px-2 py-0.5 rounded-full border ${SOURCE_COLORS[s]}`}
                title={sourceLabels[s]}
              >
                {SOURCE_LABEL_OVERRIDES[s]}
              </span>
            ))}
          </div>
          <p className="mt-2 text-caption text-stone">{sentiment.headline_count} items in 7d</p>
        </div>
      </div>
      <p className="mt-4 text-body text-graphite">{sentiment.summary}</p>
      <div className="mt-4 space-y-2">
        {headlines.length === 0 ? (
          <p className="text-body-sm text-stone">No recent headlines cached.</p>
        ) : (
          headlines.map((h) => (
            <a
              key={h.id}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block pv-card bg-fog/30 hover:bg-fog/60 transition-colors p-3 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-ink leading-snug line-clamp-2 group-hover:text-graphite">
                    {h.title}
                  </p>
                  <p className="text-caption text-stone mt-1 pv-num">
                    {SOURCE_LABEL_OVERRIDES[h.source]} · {timeAgo(h.published_at)}
                    {h.sentiment != null ? ` · tone ${h.sentiment}` : ''}
                  </p>
                </div>
                <div className="text-caption text-stone group-hover:text-graphite">↗</div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))}m ago`;
  if (diff < day) return `${Math.round(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(ts).toISOString().slice(0, 10);
}
