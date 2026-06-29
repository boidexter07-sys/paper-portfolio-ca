import * as DatabaseNS from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

type Database = DatabaseNS.Database;
const Database = (DatabaseNS as unknown as { default: new (p: string) => Database }).default ?? (DatabaseNS as unknown as new (p: string) => Database);

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'paperportfolio.db');

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  _db = db;
  return db;
}

function initSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      investing_style TEXT NOT NULL DEFAULT 'balanced',
      created_at INTEGER NOT NULL,
      acknowledged_first_signal INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stocks (
      ticker TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      exchange TEXT NOT NULL,
      sector TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      cached_price REAL,
      cached_pe REAL,
      cached_pb REAL,
      cached_roe REAL,
      cached_market_cap REAL,
      cached_dividend_yield REAL,
      cached_52w_high REAL,
      cached_52w_low REAL,
      description TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS price_history (
      ticker TEXT NOT NULL,
      date TEXT NOT NULL,
      close REAL NOT NULL,
      PRIMARY KEY (ticker, date),
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      style TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      quantity REAL NOT NULL,
      avg_cost REAL NOT NULL,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id),
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      trade_date INTEGER NOT NULL,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
    );

    CREATE TABLE IF NOT EXISTS community_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_label TEXT NOT NULL,
      detail TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      user_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, ticker)
    );

    CREATE TABLE IF NOT EXISTS glossary_views (
      user_id TEXT NOT NULL,
      term TEXT NOT NULL,
      viewed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, term)
    );

    -- ============================================================
    -- PRISM L3 (News & Sentiment) tables
    -- Refresh cadence:
    --   news_headlines   TTL 1h   (NewsAPI 100 req/day, staggered)
    --   gdelt_events     TTL 1h   (5s polling limit; one ticker at a time)
    --   reddit_mentions  TTL 6h   (no-auth .json; honours 100/min ceiling)
    --   edgar_filings    TTL 15m  (10 req/sec; ticker CIK cached)
    --   sentiment_daily  rolled-up 0-100 composite per stock per day (TTL 24h)
    --   news_seed_meta   bookkeeping for the offline demo data
    -- ============================================================
    CREATE TABLE IF NOT EXISTS news_headlines (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      source TEXT NOT NULL,
      source_name TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      published_at INTEGER NOT NULL,
      description TEXT,
      sentiment REAL,
      fetched_at INTEGER NOT NULL,
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );
    CREATE INDEX IF NOT EXISTS idx_news_ticker_time ON news_headlines(ticker, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_news_fetched ON news_headlines(ticker, fetched_at DESC);

    CREATE TABLE IF NOT EXISTS gdelt_events (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      seen_date TEXT NOT NULL,
      tone REAL,
      positive_score REAL,
      negative_score REAL,
      polarity REAL,
      activity_density REAL,
      fetched_at INTEGER NOT NULL,
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );
    CREATE INDEX IF NOT EXISTS idx_gdelt_ticker_time ON gdelt_events(ticker, seen_date DESC);
    CREATE INDEX IF NOT EXISTS idx_gdelt_fetched ON gdelt_events(ticker, fetched_at DESC);

    CREATE TABLE IF NOT EXISTS reddit_mentions (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      subreddit TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      score INTEGER NOT NULL,
      num_comments INTEGER NOT NULL,
      created_utc INTEGER NOT NULL,
      sentiment REAL,
      fetched_at INTEGER NOT NULL,
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );
    CREATE INDEX IF NOT EXISTS idx_reddit_ticker_time ON reddit_mentions(ticker, created_utc DESC);
    CREATE INDEX IF NOT EXISTS idx_reddit_fetched ON reddit_mentions(ticker, fetched_at DESC);

    CREATE TABLE IF NOT EXISTS edgar_filings (
      id TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      cik TEXT NOT NULL,
      form TEXT NOT NULL,
      filed_at TEXT NOT NULL,
      accession TEXT NOT NULL,
      primary_doc TEXT,
      description TEXT,
      url TEXT NOT NULL,
      fetched_at INTEGER NOT NULL,
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );
    CREATE INDEX IF NOT EXISTS idx_edgar_ticker_time ON edgar_filings(ticker, filed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_edgar_fetched ON edgar_filings(ticker, fetched_at DESC);

    CREATE TABLE IF NOT EXISTS sentiment_daily (
      ticker TEXT NOT NULL,
      day TEXT NOT NULL,
      composite REAL NOT NULL,
      news_score REAL,
      gdelt_score REAL,
      reddit_score REAL,
      filing_score REAL,
      headline_count INTEGER NOT NULL,
      summary TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (ticker, day),
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );
    CREATE INDEX IF NOT EXISTS idx_sentiment_day ON sentiment_daily(day);

    CREATE TABLE IF NOT EXISTS sentiment_meta (
      ticker TEXT PRIMARY KEY,
      composite REAL NOT NULL,
      delta_7d REAL NOT NULL,
      headline_count INTEGER NOT NULL,
      last_refreshed_at INTEGER NOT NULL,
      sources TEXT NOT NULL,
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );

    CREATE TABLE IF NOT EXISTS ticker_cik (
      ticker TEXT PRIMARY KEY,
      cik TEXT NOT NULL,
      company_name TEXT,
      resolved_at INTEGER NOT NULL
    );
  `);
}

export function uuid(): string {
  return crypto.randomUUID();
}
