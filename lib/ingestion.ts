// PRISM L3 — news ingestion pipeline.
//
// Plain-English: this module fetches news, Reddit mentions, GDELT events,
// and SEC EDGAR filings, scores them with the lexicon in lib/sentiment.ts,
// persists everything to SQLite, and rolls up a daily composite.
//
// Constraints from T22:
//   * $0/month — no paid tiers
//   * No LLM calls in the hot path
//   * Resilient — a network error must never crash the page render
//   * TTLs: news 1h, reddit 6h, gdelt 1h, edgar 15m
//
// All four sources are best-effort. If NEWS_API_KEY is not set we skip
// NewsAPI and rely on GDELT + Reddit + EDGAR. If the call fails we log
// a single warning and bail; the next TTL miss will retry.

import { getDb } from './db';
import {
  scoreText,
  scoreGdeltTone,
  blendComposite,
  buildSummary,
  type SentimentSource,
} from './sentiment';

// ------------------------------------------------------------------
// TTLs (ms) — single source of truth so callers don't disagree.
// ------------------------------------------------------------------
export const TTL = {
  news: 60 * 60 * 1000,        // 1 hour
  reddit: 6 * 60 * 60 * 1000,  // 6 hours
  gdelt: 60 * 60 * 1000,       // 1 hour (matches GDELT 15-min refresh cadence)
  edgar: 15 * 60 * 1000,       // 15 minutes
} as const;

const POLL_MIN_INTERVAL_MS = 5_500; // GDELT polling limit
const EDGAR_USER_AGENT = process.env['SEC_USER_AGENT'] ?? 'Paper Portfolio Canada research/1.0 (contact: research@paperportfolio.local)';
const NEWS_API_KEY = (process.env['NEWS_API_KEY'] ?? '').trim() || null;
const NEWS_API_BASE = 'https://newsapi.org/v2';
const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';
const REDDIT_BASE = 'https://www.reddit.com';
const EDGAR_BASE = 'https://www.sec.gov/cgi-bin/browse-edgar';
const EDGAR_SEARCH_BASE = 'https://efts.sec.gov/LATEST/search-index';

const HTTP_TIMEOUT_MS = 8_000;

interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

async function safeFetch(url: string, opts: FetchOptions = {}): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': EDGAR_USER_AGENT, ...(opts.headers ?? {}) },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function ttlFresh(ticker: string, table: string, ttlMs: number): boolean {
  const db = getDb();
  const row = db.prepare(
    `SELECT MAX(fetched_at) AS fresh FROM ${table} WHERE ticker = ?`,
  ).get(ticker) as { fresh: number | null } | undefined;
  if (!row?.fresh) return false;
  return Date.now() - row.fresh < ttlMs;
}

function lastFetchedAt(ticker: string, table: string): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT MAX(fetched_at) AS last FROM ${table} WHERE ticker = ?`,
  ).get(ticker) as { last: number | null } | undefined;
  return row?.last ?? 0;
}

// Respect GDELT's "one request per 5 seconds" guidance. We use the row's
// most recent GDELT fetch from any ticker as the global pacer.
async function gdeltPacer(): Promise<void> {
  const db = getDb();
  const row = db.prepare(
    `SELECT MAX(fetched_at) AS last FROM gdelt_events`,
  ).get() as { last: number | null } | undefined;
  const last = row?.last ?? 0;
  const wait = POLL_MIN_INTERVAL_MS - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

// ------------------------------------------------------------------
// Source: SEC EDGAR (free, public, 10 req/sec, no auth — just UA)
// ------------------------------------------------------------------
const CIK_TICKER_OVERRIDES: Record<string, string> = {
  BRK_B: '0001067983',
  BRK_B_B: '0001067983',
  BF_B: '0001067983',
};

export async function ensureCik(ticker: string): Promise<string | null> {
  const db = getDb();
  if (CIK_TICKER_OVERRIDES[ticker]) return CIK_TICKER_OVERRIDES[ticker];
  const row = db.prepare(
    `SELECT cik FROM ticker_cik WHERE ticker = ?`,
  ).get(ticker) as { cik: string } | undefined;
  if (row?.cik) return row.cik;
  // Resolve via SEC company tickers JSON (free, public).
  const url = `https://www.sec.gov/files/company_tickers.json`;
  const json = await safeFetch(url) as Record<string, { cik_str: number; ticker: string }> | null;
  if (!json) return null;
  const match = Object.values(json).find(
    (r) => r.ticker && r.ticker.toUpperCase() === ticker.toUpperCase(),
  );
  if (!match) return null;
  const cik = String(match.cik_str).padStart(10, '0');
  db.prepare(
    `INSERT OR REPLACE INTO ticker_cik (ticker, cik, company_name, resolved_at)
     VALUES (?, ?, ?, ?)`,
  ).run(ticker, cik, null, Date.now());
  return cik;
}

export async function ingestEdgar(ticker: string, opts: { force?: boolean } = {}): Promise<number> {
  if (!opts.force && ttlFresh(ticker, 'edgar_filings', TTL.edgar)) return 0;
  const cik = await ensureCik(ticker);
  if (!cik) return 0;
  const url = `${EDGAR_BASE}?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=10&output=atom`;
  const xml = await fetchText(url);
  const filings = xml ? parseAtomFilings(xml) : [];
  const db = getDb();
  const ins = db.prepare(
    `INSERT OR IGNORE INTO edgar_filings
     (id, ticker, cik, form, filed_at, accession, primary_doc, description, url, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction((rows: FilingRow[]) => {
    let n = 0;
    for (const r of rows) {
      const id = `edgar:${r.accession}`;
      const res = ins.run(
        id, ticker, cik, r.form, r.filedAt, r.accession, r.primaryDoc ?? null,
        r.description ?? null, r.url, Date.now(),
      );
      if (res.changes > 0) n += 1;
    }
    return n;
  });
  return tx(filings);
}

interface FilingRow {
  accession: string; form: string; filedAt: string;
  primaryDoc?: string; description?: string; url: string;
}

async function fetchText(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': EDGAR_USER_AGENT, Accept: 'application/atom+xml' },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function textOf(block: string, tag: string): string | null {
  // Matches <tag>...</tag>, ignoring CDATA wrappers; returns inner text only.
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function parseAtomFilings(xml: string): FilingRow[] {
  // Lightweight Atom XML scanner. We don't pull a heavy XML lib because
  // the response shape is stable and small (<20 entries per ticker).
  const rows: FilingRow[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const title = textOf(block, 'title') ?? '';
    const id = textOf(block, 'id') ?? '';
    const updated = textOf(block, 'updated') ?? '';
    const summary = textOf(block, 'summary') ?? textOf(block, 'content') ?? '';
    const form = title.split('-')[0]?.trim() ?? title;
    const accession = id.split('=').pop()?.replace(/[^0-9-]/g, '') ?? id;
    const urlMatch = /href="([^"]+\.htm[l]?)"/.exec(block);
    const url = urlMatch ? `https://www.sec.gov${urlMatch[1]}` : id;
    if (!form || !accession) continue;
    rows.push({
      accession,
      form,
      filedAt: updated.slice(0, 10),
      description: summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240),
      url,
    });
  }
  return rows;
}

// ------------------------------------------------------------------
// Source: GDELT (free, no key, 5-sec polling limit)
// ------------------------------------------------------------------
export async function ingestGdelt(ticker: string, opts: { force?: boolean } = {}): Promise<number> {
  if (!opts.force && ttlFresh(ticker, 'gdelt_events', TTL.gdelt)) return 0;
  await gdeltPacer();
  // GDELT expects a domain or company phrase, not a bare ticker. Use the
  // stock's name when we have it; otherwise fall back to the ticker in quotes.
  const db = getDb();
  const stock = db.prepare(`SELECT name FROM stocks WHERE ticker = ?`).get(ticker) as { name: string } | undefined;
  const query = stock?.name ? `"${escapeForGdelt(stock.name)}"` : `"${ticker}"`;
  const url = `${GDELT_BASE}?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=15&sort=datedesc`;
  const json = await safeFetch(url) as { articles?: Array<Record<string, string>> } | null;
  const articles = json?.articles ?? [];
  const ins = db.prepare(
    `INSERT OR IGNORE INTO gdelt_events
     (id, ticker, title, url, seen_date, tone, positive_score, negative_score,
      polarity, activity_density, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction((rows: GdeltRow[]) => {
    let n = 0;
    for (const r of rows) {
      const id = `gdelt:${ticker}:${r.url}`;
      const res = ins.run(
        id, ticker, r.title, r.url, r.seenDate, r.tone, r.positive,
        r.negative, r.polarity, r.activityDensity, Date.now(),
      );
      if (res.changes > 0) n += 1;
    }
    return n;
  });
  return tx(articles.map((a) => ({
    title: a.title ?? '',
    url: a.url ?? '',
    seenDate: gdeltSeenDate(a.seendate),
    tone: numOrNull(a.tone),
    positive: numOrNull(a.positive),
    negative: numOrNull(a.negative),
    polarity: numOrNull(a.polarity),
    activityDensity: numOrNull(a.activity),
  })).filter((r) => r.title && r.url));
}

interface GdeltRow {
  title: string; url: string; seenDate: string;
  tone: number | null; positive: number | null; negative: number | null;
  polarity: number | null; activityDensity: number | null;
}

function escapeForGdelt(s: string): string {
  return s.replace(/["']/g, '').replace(/\s+/g, ' ').trim();
}

function numOrNull(v: string | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// GDELT's seendate is YYYYMMDDHHMMSS in UTC. We pull the YYYYMMDD portion
// and turn it into ISO YYYY-MM-DD so SQLite date() comparisons work.
function gdeltSeenDate(raw: string | undefined): string {
  if (!raw || raw.length < 8) return new Date().toISOString().slice(0, 10);
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  return `${y}-${m}-${d}`;
}

// ------------------------------------------------------------------
// Source: NewsAPI (free tier, 100 req/day, env-key required)
// ------------------------------------------------------------------
export async function ingestNewsApi(ticker: string, opts: { force?: boolean } = {}): Promise<number> {
  if (!NEWS_API_KEY) return 0; // offline or no-key
  if (!opts.force && ttlFresh(ticker, 'news_headlines', TTL.news)) return 0;
  const cutoff = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30; // 30d window
  const url = `${NEWS_API_BASE}/everything?q=${encodeURIComponent(ticker)}&language=en&sortBy=publishedAt&from=${toIsoDate(cutoff)}&pageSize=20&apiKey=${NEWS_API_KEY}`;
  const json = await safeFetch(url, { headers: { 'X-Api-Key': NEWS_API_KEY } }) as { articles?: Array<Record<string, unknown>> } | null;
  const articles = (json?.articles ?? []).filter((a) => typeof a.url === 'string' && typeof a.title === 'string' && !(a.title as string).includes('[Removed]'));
  const db = getDb();
  const ins = db.prepare(
    `INSERT OR IGNORE INTO news_headlines
     (id, ticker, source, source_name, title, url, published_at, description, sentiment, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction((rows: NewsRow[]) => {
    let n = 0;
    for (const r of rows) {
      const id = `newsapi:${r.url}`;
      const scored = scoreText(`${r.title}. ${r.description ?? ''}`);
      const res = ins.run(
        id, ticker, 'newsapi', r.sourceName, r.title, r.url, r.publishedAt,
        r.description ?? null, scored.score, Date.now(),
      );
      if (res.changes > 0) n += 1;
    }
    return n;
  });
  return tx(articles.map((a): NewsRow => {
    const src = a.source as Record<string, unknown> | undefined;
    return {
      title: a.title as string,
      url: a.url as string,
      sourceName: typeof src?.name === 'string' ? src.name : 'NewsAPI',
      publishedAt: typeof a.publishedAt === 'string' ? Date.parse(a.publishedAt) : Date.now(),
      description: typeof a.description === 'string' ? a.description : null,
    };
  }));
}

interface NewsRow {
  title: string; url: string; sourceName: string;
  publishedAt: number; description: string | null;
}

function toIsoDate(seconds: number): string {
  // YYYY-MM-DD — exactly 10 chars so SQLite date() comparisons work.
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

// ------------------------------------------------------------------
// Source: Reddit (free, no auth via .json endpoint, ~60 req/min ceiling)
// ------------------------------------------------------------------
const REDDIT_SUBS = ['stocks', 'investing', 'wallstreetbets', 'StockMarket', 'canadianinvestor'];

export async function ingestReddit(ticker: string, opts: { force?: boolean } = {}): Promise<number> {
  if (!opts.force && ttlFresh(ticker, 'reddit_mentions', TTL.reddit)) return 0;
  const db = getDb();
  const ins = db.prepare(
    `INSERT OR IGNORE INTO reddit_mentions
     (id, ticker, subreddit, title, url, score, num_comments, created_utc, sentiment, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  let totalInserted = 0;
  // Stagger sub calls to keep well under the polite-use limit. 4 subs
  // with ~200ms gaps = 1 second per ticker.
  for (const sub of REDDIT_SUBS) {
    if (totalInserted > 0 && !opts.force) break; // don't burn the budget on cold cache beyond the first hit
    const url = `${REDDIT_BASE}/r/${sub}/search.json?q=${encodeURIComponent(ticker)}&restrict_sr=1&sort=new&limit=10&t=week`;
    const json = await safeFetch(url) as { data?: { children?: Array<{ data: Record<string, unknown> }> } } | null;
    const posts = json?.data?.children ?? [];
    const tx = db.transaction((rows: RedditRow[]) => {
      let n = 0;
      for (const r of rows) {
        const scored = scoreText(r.title);
        const res = ins.run(
          r.id, ticker, sub, r.title, r.url, r.score, r.numComments,
          r.createdUtc, scored.score, Date.now(),
        );
        if (res.changes > 0) n += 1;
      }
      return n;
    });
    const rows: RedditRow[] = posts
      .filter((p) => p.data && typeof p.data.title === 'string' && typeof p.data.url === 'string')
      .map((p): RedditRow => ({
        id: `reddit:${p.data.id}`,
        title: p.data.title as string,
        url: p.data.url as string,
        score: Number(p.data.score ?? 0),
        numComments: Number(p.data.num_comments ?? 0),
        createdUtc: Number(p.data.created_utc ?? 0),
      }));
    totalInserted += tx(rows);
    await new Promise((r) => setTimeout(r, 250));
  }
  return totalInserted;
}

interface RedditRow {
  id: string; title: string; url: string;
  score: number; numComments: number; createdUtc: number;
}

// ------------------------------------------------------------------
// Composite rollup + persistence.
// ------------------------------------------------------------------
export function rollupDaily(ticker: string): void {
  const db = getDb();
  // Score each source over the last 7 days; mean of news/reddit/etc.
  const news = db.prepare(
    `SELECT AVG(sentiment) AS s, COUNT(*) AS c FROM news_headlines
     WHERE ticker = ? AND published_at >= strftime('%s', 'now', '-7 days') * 1000`,
  ).get(ticker) as { s: number | null; c: number } | undefined;
  const gdelt = db.prepare(
    `SELECT AVG(tone) AS s, COUNT(*) AS c FROM gdelt_events
     WHERE ticker = ? AND seen_date >= date('now', '-7 days')`,
  ).get(ticker) as { s: number | null; c: number } | undefined;
  const reddit = db.prepare(
    `SELECT AVG(sentiment) AS s, COUNT(*) AS c FROM reddit_mentions
     WHERE ticker = ? AND created_utc >= strftime('%s', 'now', '-7 days')`,
  ).get(ticker) as { s: number | null; c: number } | undefined;
  const filings = db.prepare(
    `SELECT form FROM edgar_filings WHERE ticker = ? ORDER BY filed_at DESC LIMIT 10`,
  ).all(ticker) as Array<{ form: string }>;
  const today = new Date().toISOString().slice(0, 10);
  const newsScore = news?.c ? Math.round(news.s ?? 50) : null;
  const gdeltScore = gdelt?.c ? scoreGdeltTone(gdelt.s ?? null) : null;
  const redditScore = reddit?.c ? Math.round(reddit.s ?? 50) : null;
  // EDGAR: build an aggregate from form priors (mean).
  const filingsMean = filings.length
    ? Math.round(filings.map(f => edgarFormPrior(f.form)).reduce((a, b) => a + b, 0) / filings.length)
    : null;
  const composite = blendComposite({
    news: newsScore, gdelt: gdeltScore, reddit: redditScore, filings: filingsMean,
  });
  const sources: SentimentSource[] = [];
  if (newsScore != null) sources.push('news');
  if (gdeltScore != null) sources.push('gdelt');
  if (redditScore != null) sources.push('reddit');
  if (filingsMean != null) sources.push('filings');
  const headlineCount = (news?.c ?? 0) + (gdelt?.c ?? 0) + (reddit?.c ?? 0) + filings.length;
  const day7 = db.prepare(
    `SELECT composite FROM sentiment_daily WHERE ticker = ? AND day = date('now', '-7 days')`,
  ).get(ticker) as { composite: number } | undefined;
  const delta = day7 ? composite - day7.composite : 0;
  const summary = buildSummary(composite, delta, ticker);
  const now = Date.now();
  db.prepare(
    `INSERT OR REPLACE INTO sentiment_daily
     (ticker, day, composite, news_score, gdelt_score, reddit_score, filing_score,
      headline_count, summary, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    ticker, today, composite, newsScore, gdeltScore, redditScore, filingsMean,
    headlineCount, summary, now,
  );
  db.prepare(
    `INSERT OR REPLACE INTO sentiment_meta
     (ticker, composite, delta_7d, headline_count, last_refreshed_at, sources)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(ticker, composite, delta, headlineCount, now, sources.join(','));
}

function edgarFormPrior(form: string): number {
  const f = form.toUpperCase();
  if (f === 'SC 13D' || f === 'SC 13G') return 65;
  if (f === 'SC 13D/A' || f === 'SC 13G/A') return 55;
  if (f === '4') return 58;
  if (f === '8-K') return 52;
  if (f === '10-Q' || f === '10-K') return 50;
  return 50;
}

// Orchestrator: refresh every source for one ticker, in priority order
// (cheapest / most informative first). Used by per-page requests and by
// the bulk cron. Errors are swallowed by individual sources, so this
// function always returns what it managed to fetch.
export async function refreshForTicker(ticker: string, opts: { force?: boolean } = {}): Promise<{ [k in SentimentSource]?: number }> {
  const out: { [k in SentimentSource]?: number } = {};
  try { out.filings = await ingestEdgar(ticker, opts); } catch { /* swallow */ }
  try { out.news = await ingestNewsApi(ticker, opts); } catch { /* swallow */ }
  try { out.reddit = await ingestReddit(ticker, opts); } catch { /* swallow */ }
  try { out.gdelt = await ingestGdelt(ticker, opts); } catch { /* swallow */ }
  rollupDaily(ticker);
  return out;
}

// Read-only quick peek: does this ticker have any cached data we can show
// without an immediate network call? Used by the UI to decide between
// "show cached" and "show empty state".
export function cachedSources(ticker: string): SentimentSource[] {
  const db = getDb();
  const sources: SentimentSource[] = [];
  if (db.prepare(`SELECT 1 FROM news_headlines WHERE ticker = ? LIMIT 1`).get(ticker)) sources.push('news');
  if (db.prepare(`SELECT 1 FROM gdelt_events WHERE ticker = ? LIMIT 1`).get(ticker)) sources.push('gdelt');
  if (db.prepare(`SELECT 1 FROM reddit_mentions WHERE ticker = ? LIMIT 1`).get(ticker)) sources.push('reddit');
  if (db.prepare(`SELECT 1 FROM edgar_filings WHERE ticker = ? LIMIT 1`).get(ticker)) sources.push('filings');
  return sources;
}

export const sourceLabels: Record<SentimentSource, string> = {
  news: 'NewsAPI',
  gdelt: 'GDELT',
  reddit: 'Reddit',
  filings: 'SEC EDGAR',
};

// Lightweight meta-only refresh (won't do external fetches) — used for the
// inline page render so the UI shows fresh numbers without blocking.
export function isStale(ticker: string, ttlMs: number = TTL.news * 4): boolean {
  const db = getDb();
  const row = db.prepare(
    `SELECT last_refreshed_at FROM sentiment_meta WHERE ticker = ?`,
  ).get(ticker) as { last_refreshed_at: number } | undefined;
  if (!row) return true;
  return Date.now() - row.last_refreshed_at > ttlMs;
}

export { lastFetchedAt };
