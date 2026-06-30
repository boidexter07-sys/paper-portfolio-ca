// Seed script: creates demo user, 3 portfolios, ~1,210 stocks (full
// Russell 1000 + TSX Composite universe — subsumes the prior S&P 500 +
// TSX 60 scope), 50 community events.
//
// Run with: npm run seed  (from the app/ directory)
//
// Data sources (priority order):
//   1. `../prism/.cache/<TICKER>.json` written by `prism/load_universe.py` from yfinance
//      (covers Russell 1000 + TSX Composite as of June 2026)
//   2. The 20-ticker STOCK_SEEDS table (kept for backward compat and offline runs)
//   3. Synthetic random walk (deterministic per ticker) — fallback only
//
// The constituent list (ticker, name, exchange, sector, currency) comes from
//   `../prism/data/russell1000_constituents.json` + `tsx_composite_constituents.json`
//   (Russell 1000 subsumes the S&P 500; TSX Composite subsumes the TSX 60).
//   For backward compatibility, the legacy sp500/tsx60 files are also read
//   — any ticker that appears in those but not in the broader indices
//   (e.g. NXPI, STX — recent S&P 500 additions that haven't reconstituted
//   into Russell yet) is preserved as a "legacy S&P/TSX60-only" row.
//
// If a ticker has no cache file, the row is still inserted with sector/
// currency but with None fundamentals and a synthetic price history.

import { getDb, uuid } from '../lib/db';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

type StockSeed = {
  ticker: string;
  name: string;
  exchange: 'TSX' | 'NYSE' | 'NASDAQ' | 'BATS';
  sector: string;
  currency: 'CAD' | 'USD';
  description: string;
  basePrice: number;
  basePE: number;
  basePB: number;
  baseROE: number;
  baseDivYield: number;
  baseMarketCap: number; // in millions
};

// ----------------------------------------------------------------------------
// Constituents (full universe)
// ----------------------------------------------------------------------------

type Constituent = {
  ticker: string;
  name: string;
  exchange: 'TSX' | 'NYSE' | 'NASDAQ' | 'BATS' | string;
  sector: string | null;
  industry: string | null;
  currency: 'USD' | 'CAD';
  source_index?: string; // 'Russell 1000' | 'TSX Composite' | 'S&P 500' | 'TSX 60' (legacy)
};

const PRISM_DIR = path.join(process.cwd(), '..', 'prism');
const CACHE_DIR = path.join(PRISM_DIR, '.cache');
// Primary universe: Russell 1000 + TSX Composite.
const RUSSELL1000_PATH = path.join(PRISM_DIR, 'data', 'russell1000_constituents.json');
const TSXCOMPOSITE_PATH = path.join(PRISM_DIR, 'data', 'tsx_composite_constituents.json');
// Legacy S&P 500 / TSX 60 files — read for backward compatibility: any ticker
// in those but not in the broader Russell/TSXc lists (e.g. recent S&P additions
// that haven't reconstituted into Russell yet) is preserved.
const SP500_PATH = path.join(PRISM_DIR, 'data', 'sp500_constituents.json');
const TSX60_PATH = path.join(PRISM_DIR, 'data', 'tsx60_constituents.json');

function loadConstituents(): Constituent[] {
  const all: Constituent[] = [];
  const seen = new Set<string>();
  // Primary order: Russell 1000 first (largest), then TSX Composite.
  for (const p of [RUSSELL1000_PATH, TSXCOMPOSITE_PATH]) {
    if (!fs.existsSync(p)) {
      console.warn(`  WARN: constituents file not found: ${p}`);
      continue;
    }
    try {
      const rows = JSON.parse(fs.readFileSync(p, 'utf-8')) as Constituent[];
      for (const r of rows) {
        if (seen.has(r.ticker)) continue;
        seen.add(r.ticker);
        all.push(r);
      }
    } catch (e) {
      console.warn(`  WARN: failed to parse ${p}: ${e}`);
    }
  }
  // Legacy: S&P 500 + TSX 60. Add any ticker not yet in `seen` so we preserve
  // tickers that were in the prior narrow universe but aren't in the new
  // broader lists yet (recent S&P additions, etc.).
  for (const p of [SP500_PATH, TSX60_PATH]) {
    if (!fs.existsSync(p)) continue;
    try {
      const rows = JSON.parse(fs.readFileSync(p, 'utf-8')) as Constituent[];
      let added = 0;
      for (const r of rows) {
        if (seen.has(r.ticker)) continue;
        seen.add(r.ticker);
        all.push(r);
        added++;
      }
      if (added > 0) console.log(`  legacy fallback added ${added} tickers from ${path.basename(p)}`);
    } catch (e) {
      console.warn(`  WARN: failed to parse legacy ${p}: ${e}`);
    }
  }
  return all;
}

interface CachePayload {
  ok: boolean;
  fundamentals: Record<string, any>;
  info: Record<string, any>;
  price_history: { date: string; close: number }[];
}

function loadCache(ticker: string): CachePayload | null {
  const p = path.join(CACHE_DIR, `${ticker}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as CachePayload;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Curated 20-ticker demo list (kept for backward compat + offline fallback)
// ----------------------------------------------------------------------------

const STOCK_SEEDS: StockSeed[] = [
  // TSX (10)
  { ticker: 'SHOP', name: 'Shopify Inc.', exchange: 'TSX', sector: 'Technology', currency: 'CAD', description: 'Commerce platform for independent merchants.', basePrice: 95, basePE: 78, basePB: 8.5, baseROE: 9, baseDivYield: 0, baseMarketCap: 122000 },
  { ticker: 'RY', name: 'Royal Bank of Canada', exchange: 'TSX', sector: 'Financials', currency: 'CAD', description: 'Canada\'s largest bank by market cap.', basePrice: 145, basePE: 13, basePB: 1.9, baseROE: 16, baseDivYield: 3.4, baseMarketCap: 205000 },
  { ticker: 'TD', name: 'The Toronto-Dominion Bank', exchange: 'TSX', sector: 'Financials', currency: 'CAD', description: 'North American bank with retail and wholesale arms.', basePrice: 84, basePE: 11, basePB: 1.5, baseROE: 14, baseDivYield: 4.6, baseMarketCap: 152000 },
  { ticker: 'ENB', name: 'Enbridge Inc.', exchange: 'TSX', sector: 'Energy', currency: 'CAD', description: 'Pipelines and renewable energy infrastructure.', basePrice: 51, basePE: 18, basePB: 1.8, baseROE: 10, baseDivYield: 6.8, baseMarketCap: 110000 },
  { ticker: 'CNR', name: 'Canadian National Railway', exchange: 'TSX', sector: 'Industrials', currency: 'CAD', description: 'Transcontinental freight railroad.', basePrice: 153, basePE: 22, basePB: 4.1, baseROE: 19, baseDivYield: 1.8, baseMarketCap: 101000 },
  { ticker: 'BNS', name: 'Bank of Nova Scotia', exchange: 'TSX', sector: 'Financials', currency: 'CAD', description: 'Canadian bank with strong Latin America exposure.', basePrice: 67, basePE: 11, basePB: 1.3, baseROE: 11, baseDivYield: 5.2, baseMarketCap: 79000 },
  { ticker: 'BMO', name: 'Bank of Montreal', exchange: 'TSX', sector: 'Financials', currency: 'CAD', description: 'Canadian bank with US commercial banking arm.', basePrice: 117, basePE: 12, basePB: 1.3, baseROE: 10, baseDivYield: 4.3, baseMarketCap: 88000 },
  { ticker: 'CP', name: 'Canadian Pacific Kansas City', exchange: 'TSX', sector: 'Industrials', currency: 'CAD', description: 'Transcontinental freight railroad.', basePrice: 106, basePE: 27, basePB: 2.6, baseROE: 10, baseDivYield: 0.7, baseMarketCap: 99000 },
  { ticker: 'L', name: 'Loblaw Companies', exchange: 'TSX', sector: 'Consumer Staples', currency: 'CAD', description: 'Canada\'s largest retailer and pharmacy chain.', basePrice: 162, basePE: 24, basePB: 4.4, baseROE: 19, baseDivYield: 1.2, baseMarketCap: 55000 },
  { ticker: 'WCN', name: 'Waste Connections', exchange: 'TSX', sector: 'Industrials', currency: 'CAD', description: 'Solid waste services in North America.', basePrice: 197, basePE: 32, basePB: 5.0, baseROE: 16, baseDivYield: 0.7, baseMarketCap: 64000 },
  // US (10)
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', currency: 'USD', description: 'Consumer electronics, services, and silicon.', basePrice: 218, basePE: 31, basePB: 47, baseROE: 145, baseDivYield: 0.5, baseMarketCap: 3300000 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', sector: 'Technology', currency: 'USD', description: 'Cloud, productivity, and AI platform.', basePrice: 425, basePE: 35, basePB: 11, baseROE: 35, baseDivYield: 0.7, baseMarketCap: 3160000 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financials', currency: 'USD', description: 'Largest US bank by assets.', basePrice: 211, basePE: 12, basePB: 1.8, baseROE: 17, baseDivYield: 2.1, baseMarketCap: 605000 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', exchange: 'NYSE', sector: 'Energy', currency: 'USD', description: 'Integrated oil and gas major.', basePrice: 116, basePE: 14, basePB: 1.9, baseROE: 15, baseDivYield: 3.3, baseMarketCap: 460000 },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', sector: 'Financials', currency: 'USD', description: 'Diversified holding company.', basePrice: 458, basePE: 9, basePB: 1.5, baseROE: 17, baseDivYield: 0, baseMarketCap: 990000 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', sector: 'Healthcare', currency: 'USD', description: 'Pharmaceuticals and medical devices.', basePrice: 162, basePE: 22, basePB: 5.7, baseROE: 22, baseDivYield: 3.0, baseMarketCap: 390000 },
  { ticker: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE', sector: 'Consumer Staples', currency: 'USD', description: 'Consumer packaged goods conglomerate.', basePrice: 167, basePE: 26, basePB: 7.5, baseROE: 30, baseDivYield: 2.4, baseMarketCap: 392000 },
  { ticker: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Financials', currency: 'USD', description: 'Global payments network.', basePrice: 281, basePE: 31, basePB: 14, baseROE: 47, baseDivYield: 0.8, baseMarketCap: 568000 },
  { ticker: 'COST', name: 'Costco Wholesale Corp.', exchange: 'NASDAQ', sector: 'Consumer Staples', currency: 'USD', description: 'Membership-based warehouse retailer.', basePrice: 906, basePE: 54, basePB: 17, baseROE: 33, baseDivYield: 0.5, baseMarketCap: 401000 },
  { ticker: 'KO', name: 'The Coca-Cola Co.', exchange: 'NYSE', sector: 'Consumer Staples', currency: 'USD', description: 'Beverages and bottling.', basePrice: 71, basePE: 25, basePB: 11, baseROE: 42, baseDivYield: 2.7, baseMarketCap: 305000 },
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Deterministic synthetic price series: 252 trading days back, geometric random walk.
function syntheticPriceHistory(ticker: string, basePrice: number, days = 252): { date: string; close: number }[] {
  // Seeded RNG (mulberry32)
  let seed = hashCode(ticker);
  const rand = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Box-Muller for normal random
  const normal = () => {
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const out: { date: string; close: number }[] = [];
  // Walk backwards from basePrice to ~30% of base at 252d ago, then forward.
  const drift = 0.0004; // ~10% annualized
  const vol = 0.018; // ~28% annualized vol
  const today = new Date('2026-06-27');
  let price = basePrice * 0.85; // start ~15% below current
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    price *= 1 + drift + vol * normal() * 0.7;
    out.push({ date: d.toISOString().slice(0, 10), close: Math.round(price * 100) / 100 });
  }
  // Make the last day exactly basePrice
  if (out.length > 0) out[out.length - 1].close = basePrice;
  return out;
}

// ----------------------------------------------------------------------------
// Seed expansion
// ----------------------------------------------------------------------------

const constituents = loadConstituents();
const seedByTicker = new Map<string, StockSeed>();
for (const s of STOCK_SEEDS) seedByTicker.set(s.ticker, s);

function tryYfinancePull(ticker: string): { price: number; history: { date: string; close: number }[]; pe: number; pb: number; roe: number; mcap: number; dy: number } | null {
  const script = path.join(process.cwd(), 'seed', '_yfinance_pull.py');
  const res = spawnSync('python3', [script, ticker], { encoding: 'utf-8', timeout: 20000 });
  if (res.status !== 0) return null;
  try {
    const out = JSON.parse(res.stdout);
    if (!out || !out.ok) return null;
    return out;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// DB
// ----------------------------------------------------------------------------

const db = getDb();
console.log('Seeding Paper Portfolio Canada prototype DB...');

db.exec(`
  -- Order matters: child tables first, parents last. Newer L3 (news/sentiment)
  -- tables also FK to stocks, so they have to be cleared before stocks.
  DELETE FROM glossary_views;
  DELETE FROM watchlist;
  DELETE FROM trades;
  DELETE FROM holdings;
  DELETE FROM portfolios;
  DELETE FROM community_events;
  DELETE FROM price_history;
  DELETE FROM news_headlines;
  DELETE FROM gdelt_events;
  DELETE FROM reddit_mentions;
  DELETE FROM edgar_filings;
  DELETE FROM sentiment_daily;
  DELETE FROM sentiment_meta;
  DELETE FROM ticker_cik;
  DELETE FROM stocks;
  DELETE FROM users;
`);

// 1. Demo user
import { hashPassword } from '../lib/auth';
const DEMO_EMAIL = 'demo@paperportfolio.ca';
const DEMO_PASSWORD = 'password123';
const userId = uuid();
const createdAt = Date.now() - 1000 * 60 * 60 * 24 * 2; // started trial 2 days ago
db.prepare(
  'INSERT INTO users (id, email, password_hash, investing_style, created_at, acknowledged_first_signal) VALUES (?, ?, ?, ?, ?, ?)'
).run(userId, DEMO_EMAIL, hashPassword(DEMO_PASSWORD), 'balanced', createdAt, 0);
console.log(`  - user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

// 2. Stocks + price history (full universe).
const insertStock = db.prepare(`
  INSERT INTO stocks (ticker, name, exchange, sector, currency, cached_price, cached_pe, cached_pb, cached_roe, cached_market_cap, cached_dividend_yield, cached_52w_high, cached_52w_low, description, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertPrice = db.prepare('INSERT INTO price_history (ticker, date, close) VALUES (?, ?, ?)');

let useLiveData = true;
let withCache = 0;
let withSeed = 0;
let syntheticOnly = 0;
const inserts: { ticker: string; ok: boolean; reason: string }[] = [];

for (const c of constituents) {
  // Pick the best available data source, in priority order.
  const cache = loadCache(c.ticker);
  const seed = seedByTicker.get(c.ticker);

  let price: number | null = null;
  let pe: number | null = null;
  let pb: number | null = null;
  let roe: number | null = null;
  let dy: number | null = null;
  let mcap: number | null = null;
  let history: { date: string; close: number }[] = [];
  let description: string | null = null;
  let source = '';

  if (cache && cache.ok) {
    const f = cache.fundamentals || {};
    const info = cache.info || {};
    price = f.current_price ?? null;
    pe = f.pe_ratio ?? null;
    pb = f.pb_ratio ?? null;
    roe = f.roe != null ? f.roe * 100 : null;  // convert fraction to %
    dy = f.dividend_yield != null ? f.dividend_yield * 100 : null;
    mcap = info.marketCap != null ? info.marketCap / 1e6 : null;  // dollars → millions
    history = (cache.price_history || []).map((h) => ({ date: h.date, close: h.close }));
    description = f._reference_summary ?? null;
    source = 'cache';
    withCache++;
  } else if (seed) {
    price = seed.basePrice;
    pe = seed.basePE;
    pb = seed.basePB;
    roe = seed.baseROE;
    dy = seed.baseDivYield;
    mcap = seed.baseMarketCap;
    history = syntheticPriceHistory(c.ticker, seed.basePrice);
    description = seed.description;
    source = 'seed-fallback';
    withSeed++;
  } else {
    // Pure synthetic — no real data available. Pick a plausible price.
    const basePrice = c.currency === 'CAD' ? 50 : 100;
    price = basePrice;
    history = syntheticPriceHistory(c.ticker, basePrice);
    description = `${c.name} — synthetic placeholder data. Cache file missing; re-run \`python load_universe.py --source ${c.exchange === 'TSX' ? 'tsxcomposite' : 'russell1000'}\` to populate.`;
    source = 'synthetic';
    syntheticOnly++;
  }

  // Compute 52-week high/low from history. If price_history is empty, use price.
  let high52: number | null = price;
  let low52: number | null = price;
  if (history.length > 0) {
    const closes = history.map((h) => h.close).filter((v) => typeof v === 'number' && !Number.isNaN(v));
    if (closes.length > 0) {
      high52 = Math.max(...closes);
      low52 = Math.min(...closes);
    }
  }

  // Exchange & sector: prefer constituents, fall back to seed.
  const exchange = c.exchange;
  const sector = c.sector || seed?.sector || null;
  const currency = c.currency;

  try {
    insertStock.run(
      c.ticker,
      c.name,
      exchange,
      sector,
      currency,
      price,
      pe,
      pb,
      roe,
      mcap,
      dy,
      high52,
      low52,
      description,
      Date.now()
    );
    for (const p of history) {
      if (typeof p.close === 'number') {
        insertPrice.run(c.ticker, p.date, p.close);
      }
    }
    inserts.push({ ticker: c.ticker, ok: true, reason: source });
  } catch (e) {
    inserts.push({ ticker: c.ticker, ok: false, reason: `insert failed: ${e}` });
  }
}

console.log(`  - ${constituents.length} total constituents`);
console.log(`    from yfinance cache: ${withCache}`);
console.log(`    from seed fallback (20 demo): ${withSeed}`);
console.log(`    synthetic only: ${syntheticOnly}`);
const failed = inserts.filter((i) => !i.ok);
if (failed.length > 0) {
  console.warn(`  WARN: ${failed.length} inserts failed:`);
  for (const f of failed.slice(0, 10)) console.warn(`    - ${f.ticker}: ${f.reason}`);
}
if (syntheticOnly > 0) {
  console.warn(`  WARN: ${syntheticOnly} tickers had no cache and no seed — using synthetic data.`);
  console.warn(`         Re-run python load_universe.py to populate.`);
}

// 3. Three demo portfolios (8 names each, mix of TSX + US). The names
// span the full Russell 1000 + TSX Composite universe — not just S&P 500
// + TSX 60 — so the demo reflects the broader investable set.
const PORTFOLIO_DEFS: { name: string; style: 'value' | 'growth' | 'balanced'; holdings: { ticker: string; qty: number; cost: number }[] }[] = [
  {
    name: 'TSX Value Sleeve',
    style: 'value',
    holdings: [
      { ticker: 'RY', qty: 40, cost: 138 },
      { ticker: 'TD', qty: 60, cost: 79 },
      { ticker: 'ENB', qty: 80, cost: 49 },
      { ticker: 'BNS', qty: 50, cost: 64 },
      { ticker: 'BMO', qty: 25, cost: 113 },
      { ticker: 'NA', qty: 30, cost: 110 },
      { ticker: 'CNR', qty: 12, cost: 145 },
      { ticker: 'L', qty: 8, cost: 155 },
    ],
  },
  {
    name: 'US Growth Sleeve',
    style: 'growth',
    holdings: [
      { ticker: 'AAPL', qty: 12, cost: 195 },
      { ticker: 'MSFT', qty: 8, cost: 380 },
      { ticker: 'SHOP', qty: 25, cost: 78 },
      { ticker: 'COST', qty: 3, cost: 820 },
      { ticker: 'V', qty: 10, cost: 255 },
      { ticker: 'NVDA', qty: 6, cost: 850 },
      { ticker: 'AMZN', qty: 7, cost: 175 },
      { ticker: 'META', qty: 5, cost: 470 },
    ],
  },
  {
    name: 'Mid-Cap Discovery Sleeve',
    // Pulls from names that are Russell 1000 / TSX Composite but NOT in the
    // S&P 500 / TSX 60 — exercises the broader universe the demo now covers.
    style: 'balanced',
    holdings: [
      { ticker: 'ARES', qty: 25, cost: 145 },    // Ares Management — Russell 1000 financials
      { ticker: 'AME', qty: 8, cost: 175 },      // Ametek — Russell 1000 industrials
      { ticker: 'EME', qty: 8, cost: 410 },      // Emcor — Russell 1000 construction & engineering
      { ticker: 'FNF', qty: 40, cost: 56 },      // Fidelity National Financial — Russell 1000 financials
      { ticker: 'PNR', qty: 18, cost: 88 },      // Pentair — Russell 1000 industrials
      { ticker: 'WMS', qty: 10, cost: 320 },     // Advanced Drainage Systems — Russell 1000
      { ticker: 'TIH', qty: 14, cost: 165 },     // Toromont Industries — TSX Composite industrials
      { ticker: 'CSH.UN', qty: 30, cost: 14 },   // Chartwell Retirement Residences — TSX Composite REIT
    ],
  },
];

const insertPortfolio = db.prepare('INSERT INTO portfolios (id, user_id, name, style, created_at, cash_balance) VALUES (?, ?, ?, ?, ?, ?)');
const insertHolding = db.prepare('INSERT INTO holdings (portfolio_id, ticker, quantity, avg_cost) VALUES (?, ?, ?, ?)');
const insertTrade = db.prepare('INSERT INTO trades (id, portfolio_id, ticker, side, quantity, price, trade_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
const tradeDateBase = Date.now() - 1000 * 60 * 60 * 24 * 14;
let primaryPortfolioId: string | null = null;
for (const p of PORTFOLIO_DEFS) {
  const pid = uuid();
  if (!primaryPortfolioId) primaryPortfolioId = pid;
  // T40: every demo portfolio is pre-loaded with the standard starting cash
  // (matches the column default; explicit here so the seed is self-documenting
  // and stays correct if someone changes the schema default).
  insertPortfolio.run(pid, userId, p.name, p.style, tradeDateBase, 100000);
  for (const h of p.holdings) {
    insertHolding.run(pid, h.ticker, h.qty, h.cost);
    insertTrade.run(uuid(), pid, h.ticker, 'buy', h.qty, h.cost, tradeDateBase + Math.floor(Math.random() * 7) * 86400000);
  }
}
console.log(`  - ${PORTFOLIO_DEFS.length} paper portfolios for demo user`);

// 4. 50 community events (draw from the full universe, not just 20).
const COMMUNITY_TEMPLATES = [
  (t: string) => ({ event_type: 'paper_buy', actor_label: 'Anonymous peer #A3F1', detail: `bought 5 shares of ${t} (paper)` }),
  (t: string) => ({ event_type: 'paper_buy', actor_label: 'Anonymous peer #B71C', detail: `bought 12 shares of ${t} (paper)` }),
  (t: string) => ({ event_type: 'watchlist_add', actor_label: 'Anonymous peer #29EA', detail: `added ${t} to watchlist` }),
  (t: string) => ({ event_type: 'watchlist_add', actor_label: 'Anonymous peer #C44B', detail: `added ${t} to watchlist` }),
  (t: string) => ({ event_type: 'paper_sell', actor_label: 'Anonymous peer #D88F', detail: `sold 3 shares of ${t} (paper)` }),
  (t: string) => ({ event_type: 'prism_followed', actor_label: 'Anonymous peer #E12B', detail: `saved PRISM signal for ${t}` }),
];
const insertEvent = db.prepare('INSERT INTO community_events (ticker, event_type, actor_label, detail, created_at) VALUES (?, ?, ?, ?, ?)');
const now = Date.now();
// Use a seeded RNG so the 50 events are deterministic.
let evSeed = hashCode('paper-portfolio-ca-community-events');
const evRand = () => {
  evSeed |= 0; evSeed = (evSeed + 0x6D2B79F5) | 0;
  let t = Math.imul(evSeed ^ (evSeed >>> 15), 1 | evSeed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
for (let i = 0; i < 50; i++) {
  const t = constituents[Math.floor(evRand() * constituents.length)].ticker;
  const tmpl = COMMUNITY_TEMPLATES[i % COMMUNITY_TEMPLATES.length];
  const e = tmpl(t);
  const ts = now - Math.floor(evRand() * 14) * 86400000 - Math.floor(evRand() * 86400000);
  insertEvent.run(t, e.event_type, e.actor_label, e.detail, ts);
}
console.log(`  - 50 community events`);

console.log('Done.');
console.log(`\nLogin at /login with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
if (syntheticOnly > 0) {
  console.log(`\nNote: ${syntheticOnly} stocks are using synthetic data (no yfinance cache).`);
  console.log('      Run `python load_universe.py` to populate, then re-seed.');
}
if (withSeed > 0) {
  console.log(`Note: ${withSeed} stocks used the 20-ticker demo seed (cache missing).`);
}