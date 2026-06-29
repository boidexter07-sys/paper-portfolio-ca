// PRISM L3 — news & sentiment scoring.
//
// Plain-English: we don't call an LLM on every headline. We score text with a
// compact finance lexicon (positive/negative word lists tuned for earnings,
// M&A, macro events). GDELT already gives us a tone field, so we use that
// directly when present. We blend the four source scores into a single
// composite in the 0-100 range so it slots into the existing PRISM bands.
//
// Sources: news_headlines, gdelt_events, reddit_mentions, edgar_filings
// Weights (within L3): news 0.40, gdelt 0.30, reddit 0.20, filings 0.10
// Output: composite in [0,100]; 0 = very bearish, 100 = very bullish.

import { getDb } from './db';

// ------------------------------------------------------------------
// Finance lexicon — compact, deterministic, no LLM dependency.
// Roughly inspired by Loughran-McDonald (2011) words most relevant
// to retail news consumption. NO copyrighted material.
// ------------------------------------------------------------------
const POSITIVE_WORDS = new Set([
  'beat', 'beats', 'beating', 'exceeded', 'exceeds', 'exceeding',
  'surge', 'surges', 'surging', 'soar', 'soars', 'soaring',
  'rally', 'rallies', 'rallying',
  'gain', 'gains', 'gaining', 'gained',
  'profit', 'profits', 'profitable', 'profitability',
  'record', 'records', 'record-high', 'all-time-high',
  'upgrade', 'upgrades', 'upgraded', 'upgrading',
  'outperform', 'outperforms', 'outperformed',
  'buyback', 'buybacks', 'repurchase',
  'dividend', 'dividends', 'hike', 'hikes', 'raised', 'boost',
  'approval', 'approved', 'clearance', 'authorized',
  'breakthrough', 'innovation', 'launch', 'launches', 'launched',
  'partnership', 'deal', 'contract', 'wins', 'won',
  'expansion', 'expands', 'expanded', 'growing', 'growth',
  'strong', 'robust', 'solid', 'healthy', 'optimistic',
  'raise', 'raised', 'raises', 'lifting', 'lift',
  'bullish', 'upbeat', 'confident',
  'recovery', 'rebound', 'rebounding',
  'inflows', 'demand', 'popularity', 'momentum',
]);

const NEGATIVE_WORDS = new Set([
  'miss', 'missed', 'misses', 'missing',
  'fall', 'falls', 'falling', 'fell', 'plunge', 'plunges', 'plunging',
  'drop', 'drops', 'dropped', 'slump', 'slumps',
  'loss', 'losses', 'loss-making', 'deficit',
  'cut', 'cuts', 'cutting', 'slash', 'slashes', 'slashed',
  'downgrade', 'downgrades', 'downgraded',
  'underperform', 'underperformed',
  'lawsuit', 'sued', 'sues', 'litigation',
  'investigation', 'probe', 'subpoena', 'subpoenaed',
  'fine', 'fined', 'penalty', 'penalties', 'sanctions',
  'recall', 'recalled', 'recalls',
  'layoff', 'layoffs', 'fired', 'firing', 'job cuts',
  'bankruptcy', 'bankrupt', 'insolvent', 'insolvency',
  'default', 'defaulted', 'defaulting',
  'fraud', 'scandal', 'misconduct', 'whistleblower',
  'weak', 'softer', 'soft', 'disappointing', 'disappointed',
  'bearish', 'pessimistic', 'gloomy', 'cautious',
  'concern', 'concerns', 'worried', 'worry', 'fear', 'fears',
  'warning', 'warned', 'warns',
  'downturn', 'recession', 'contraction',
  'selloff', 'selling-off', 'sell-off',
  'delay', 'delayed', 'postpone', 'postponed', 'shelve',
  'halt', 'halted', 'suspend', 'suspended', 'suspension',
  'crash', 'tumble', 'tumbles',
  'negative', 'losses-mount', 'pressure', 'under-pressure',
]);

const NEGATION_WORDS = new Set([
  'not', 'no', 'never', 'without', "doesn't", "isn't", "wasn't",
  "aren't", "don't", "didn't", "won't", "wouldn't", "can't", "cannot",
]);

const AMPLIFIER_WORDS = new Set([
  'very', 'extremely', 'significantly', 'sharply', 'dramatically',
  'major', 'massive', 'huge', 'big', 'record', 'historic',
]);

// Source-specific weights used when computing the composite.
export const L3_WEIGHTS = {
  news: 0.40,
  gdelt: 0.30,
  reddit: 0.20,
  filings: 0.10,
} as const;

// Within the full PRISM composite. Per L3_L4_L5_spec.md: 15-20%.
// We pin to 0.20 (20%) for v0.6 — comfortable under the cap, leaves room
// to grow if L4/L5 ship and we want to drag L3 down to 0.15.
export const L3_IN_PRISM_WEIGHT = 0.20;
export const L3_PLACEHOLDER_WEIGHT = 0.50; // the v0.5 baseline placeholder it displaces

export type SentimentSource = 'news' | 'gdelt' | 'reddit' | 'filings';

export interface ScoredText {
  raw: number;       // -1..+1
  score: number;     // 0..100
  positiveHits: number;
  negativeHits: number;
}

export interface CompositeSentiment {
  ticker: string;
  composite: number;
  delta_7d: number;     // composite minus composite 7 days ago
  news: number | null;
  gdelt: number | null;
  reddit: number | null;
  filings: number | null;
  headline_count: number;
  last_refreshed_at: number;
  sources: SentimentSource[];
  summary: string;      // plain-language line, used by the UI
}

export interface RecentHeadline {
  id: string;
  source: SentimentSource;
  source_label: string;
  title: string;
  url: string;
  published_at: number;
  sentiment: number | null; // 0..100
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Score a piece of text. Count positive/negative hits with simple negation +
// amplifier rules. Cap at +/-1 so a 1,000-word doc can't go to infinity.
export function scoreText(text: string): ScoredText {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { raw: 0, score: 50, positiveHits: 0, negativeHits: 0 };
  }
  let positiveHits = 0;
  let negativeHits = 0;
  let amplifierPending = 0;
  let negationPending = false;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (AMPLIFIER_WORDS.has(tok)) {
      amplifierPending += 1;
      continue;
    }
    if (NEGATION_WORDS.has(tok)) {
      negationPending = true;
      continue;
    }
    const amp = 1 + Math.min(amplifierPending, 2) * 0.5;
    const isPos = POSITIVE_WORDS.has(tok);
    const isNeg = NEGATIVE_WORDS.has(tok);
    if (isPos) {
      if (negationPending) {
        negativeHits += amp;
      } else {
        positiveHits += amp;
      }
    } else if (isNeg) {
      if (negationPending) {
        positiveHits += amp * 0.5; // "not bad" is mildly positive
      } else {
        negativeHits += amp;
      }
    }
    if (isPos || isNeg) {
      amplifierPending = 0;
      negationPending = false;
    }
  }
  const total = positiveHits + negativeHits;
  if (total === 0) {
    return { raw: 0, score: 50, positiveHits, negativeHits };
  }
  const raw = (positiveHits - negativeHits) / total;
  const clamped = Math.max(-1, Math.min(1, raw));
  // Map -1..+1 to 0..100
  const score = Math.round((clamped + 1) * 50);
  return { raw: clamped, score, positiveHits, negativeHits };
}

// GDELT returns a `tone` field already in roughly [-100, +100]. Convert to 0..100.
export function scoreGdeltTone(tone: number | null | undefined): number {
  if (tone == null || !Number.isFinite(tone)) return 50;
  const clamped = Math.max(-100, Math.min(100, tone));
  return Math.round((clamped + 100) / 2);
}

// SEC EDGAR filings don't carry sentiment. Use form-type priors instead.
// (8-K = newsworthy event, neutral baseline; SC 13 = insider; 10-Q = routine;
// 10-K = annual; DEF 14A = proxy; S-1 = IPO; CT ORDER = confidential; etc.)
function edgarFormScore(form: string): number {
  const f = form.toUpperCase();
  if (f === 'SC 13D' || f === 'SC 13G') return 65; // 5%+ holder = activist interest
  if (f === 'SC 13D/A' || f === 'SC 13G/A') return 55;
  if (f === 'FORM 4' || f === '4') return 58; // insider trade
  if (f === '8-K') return 52; // material event
  if (f === '10-Q' || f === '10-K') return 50; // routine
  if (f === 'DEF 14A') return 50;
  if (f === 'S-1' || f === 'S-1/A') return 58;
  if (f === 'CT ORDER') return 50;
  if (f === '424B4' || f === '424B5') return 55;
  return 50;
}

// Compose the four sub-scores into one. Each input is 0..100 (or null).
// Missing inputs are redistributed proportionally to the present inputs.
export function blendComposite(
  parts: { news?: number | null; gdelt?: number | null; reddit?: number | null; filings?: number | null },
): number {
  const present: Array<[keyof typeof L3_WEIGHTS, number]> = [];
  if (parts.news != null) present.push(['news', parts.news]);
  if (parts.gdelt != null) present.push(['gdelt', parts.gdelt]);
  if (parts.reddit != null) present.push(['reddit', parts.reddit]);
  if (parts.filings != null) present.push(['filings', parts.filings]);
  if (present.length === 0) return 50;
  const totalWeight = present.reduce((s, [k]) => s + L3_WEIGHTS[k], 0);
  if (totalWeight === 0) return 50;
  const weighted = present.reduce((s, [k, v]) => s + v * L3_WEIGHTS[k], 0);
  const scaled = weighted / totalWeight; // re-distribute missing weights
  return Math.round(Math.max(0, Math.min(100, scaled)));
}

// Plain-language summary used by the UI. Same template the brief specified:
// "Sentiment for AAPL is bullish — 73 (up from 52 last week)"
export function buildSummary(score: number, delta7d: number, ticker: string): string {
  const band =
    score >= 75 ? 'very bullish' :
    score >= 60 ? 'bullish' :
    score >= 45 ? 'neutral' :
    score >= 30 ? 'bearish' :
    'very bearish';
  const dir =
    delta7d > 5 ? `up from ${Math.round(score - delta7d)} last week` :
    delta7d < -5 ? `down from ${Math.round(score - delta7d)} last week` :
    'flat from last week';
  return `Sentiment for ${ticker} is ${band} — ${score} (${dir})`;
}

export function delta7dArrow(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 5) return 'up';
  if (delta < -5) return 'down';
  return 'flat';
}

// Read most recent composite for a ticker.
export function readSentimentMeta(ticker: string): CompositeSentiment | null {
  const db = getDb();
  const meta = db.prepare(
    `SELECT ticker, composite, delta_7d, headline_count, last_refreshed_at, sources
     FROM sentiment_meta WHERE ticker = ?`,
  ).get(ticker) as {
    ticker: string; composite: number; delta_7d: number;
    headline_count: number; last_refreshed_at: number; sources: string;
  } | undefined;
  if (!meta) return null;
  const sources = meta.sources.split(',').filter(Boolean) as SentimentSource[];
  const day = db.prepare(
    `SELECT news_score, gdelt_score, reddit_score, filing_score, summary
     FROM sentiment_daily WHERE ticker = ? ORDER BY day DESC LIMIT 1`,
  ).get(ticker) as {
    news_score: number | null; gdelt_score: number | null;
    reddit_score: number | null; filing_score: number | null;
    summary: string;
  } | undefined;
  return {
    ticker: meta.ticker,
    composite: meta.composite,
    delta_7d: meta.delta_7d,
    headline_count: meta.headline_count,
    last_refreshed_at: meta.last_refreshed_at,
    sources,
    summary: day?.summary ?? `Sentiment for ${ticker} is neutral — ${meta.composite} (flat)`,
    news: day?.news_score ?? null,
    gdelt: day?.gdelt_score ?? null,
    reddit: day?.reddit_score ?? null,
    filings: day?.filing_score ?? null,
  };
}

// Read top-N recent items across news + gdelt + reddit + filings, deduped by URL,
// sorted by recency. Used by the UI to render the headline list.
export function readRecentHeadlines(ticker: string, limit = 3): RecentHeadline[] {
  const db = getDb();
  const news = db.prepare(
    `SELECT id, source_name AS source_label, title, url, published_at, sentiment, 'news' AS source
     FROM news_headlines WHERE ticker = ? ORDER BY published_at DESC LIMIT ?`,
  ).all(ticker, limit * 2) as Array<{ id: string; source_label: string; title: string; url: string; published_at: number; sentiment: number | null; source: SentimentSource }>;
  const gdelt = db.prepare(
    `SELECT id, 'GDELT' AS source_label, title, url, strftime('%s', seen_date) * 1000 AS published_at, tone AS sentiment, 'gdelt' AS source
     FROM gdelt_events WHERE ticker = ? ORDER BY seen_date DESC LIMIT ?`,
  ).all(ticker, limit * 2) as Array<{ id: string; source_label: string; title: string; url: string; published_at: number; sentiment: number | null; source: SentimentSource }>;
  const reddit = db.prepare(
    `SELECT id, subreddit AS source_label, title, url, created_utc AS published_at, sentiment, 'reddit' AS source
     FROM reddit_mentions WHERE ticker = ? ORDER BY created_utc DESC LIMIT ?`,
  ).all(ticker, limit * 2) as Array<{ id: string; source_label: string; title: string; url: string; published_at: number; sentiment: number | null; source: SentimentSource }>;
  const filings = db.prepare(
    `SELECT id, ('EDGAR ' || form) AS source_label, (form || ' ' || filed_at) AS title,
            url, strftime('%s', filed_at) * 1000 AS published_at, NULL AS sentiment, 'filings' AS source
     FROM edgar_filings WHERE ticker = ? ORDER BY filed_at DESC LIMIT ?`,
  ).all(ticker, limit * 2) as Array<{ id: string; source_label: string; title: string; url: string; published_at: number; sentiment: number | null; source: SentimentSource }>;
  const seen = new Set<string>();
  const merged: RecentHeadline[] = [];
  for (const arr of [news, gdelt, reddit, filings]) {
    for (const r of arr) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      merged.push(r);
    }
  }
  merged.sort((a, b) => b.published_at - a.published_at);
  return merged.slice(0, limit);
}

// Read the last 7 daily composite scores (oldest -> newest). For the
// 7-day delta line + future sparkline.
export function readSentimentWeek(ticker: string): Array<{ day: string; composite: number }> {
  const db = getDb();
  const rows = db.prepare(
    `SELECT day, composite FROM sentiment_daily
     WHERE ticker = ? AND day >= date('now', '-7 days')
     ORDER BY day ASC`,
  ).all(ticker) as Array<{ day: string; composite: number }>;
  return rows;
}
