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
      -- T40: paper-trade cash balance. Every new portfolio starts with
      -- STARTING_CASH_CAD (CAD $100,000 by default — industry standard for
      -- paper trading). Buy trades deduct, sell trades credit. Stored as
      -- REAL; never goes negative (enforced in saveTrade).
      cash_balance REAL NOT NULL DEFAULT 100000,
      -- T41: starting_cash captured once at portfolio creation. Distinct
      -- from cash_balance (which moves with buys/sells) so the UI can
      -- show a stable "Started at $X" badge forever. New rows from
      -- createInitialPortfolio/createAdditionalPortfolio always set this
      -- explicitly; the migration below backfills existing rows with the
      -- legacy default.
      starting_cash REAL NOT NULL DEFAULT 100000,
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

    -- =================================================================
    -- ARENA Community & Discussion Forum (T38)
    -- 8 tables: threads, comments, reactions, reports, mentions,
    -- notifications, moderation queue, suspensions. Soft delete only.
    -- Moderation status is denormalized onto the row so reads skip the
    -- queue JOIN. Indexes target the list, tree-fetch, and queue-poll
    -- queries in the v1 spec.
    -- =================================================================
    CREATE TABLE IF NOT EXISTS user_community (
      user_id TEXT PRIMARY KEY,
      display_name TEXT UNIQUE NOT NULL,
      display_name_changed_at INTEGER,
      thread_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      reputation_score INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS community_threads (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      published_at INTEGER,
      last_activity_at INTEGER NOT NULL,
      deleted_at INTEGER,
      hidden_at INTEGER,
      edit_count INTEGER NOT NULL DEFAULT 0,
      moderation_status TEXT NOT NULL DEFAULT 'clean',
      comment_count INTEGER NOT NULL DEFAULT 0,
      reaction_score INTEGER NOT NULL DEFAULT 0,
      reaction_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_ct_category_activity ON community_threads(category, last_activity_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ct_author_created ON community_threads(author_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ct_mod_status ON community_threads(moderation_status, last_activity_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ct_published ON community_threads(published_at, last_activity_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ct_hidden ON community_threads(hidden_at) WHERE hidden_at IS NULL;

    CREATE TABLE IF NOT EXISTS community_comments (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      parent_comment_id TEXT,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      published_at INTEGER,
      deleted_at INTEGER,
      hidden_at INTEGER,
      edit_count INTEGER NOT NULL DEFAULT 0,
      moderation_status TEXT NOT NULL DEFAULT 'clean',
      reaction_score INTEGER NOT NULL DEFAULT 0,
      reaction_count INTEGER NOT NULL DEFAULT 0,
      depth INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (thread_id) REFERENCES community_threads(id),
      FOREIGN KEY (parent_comment_id) REFERENCES community_comments(id)
    );
    CREATE INDEX IF NOT EXISTS idx_cc_thread_parent ON community_comments(thread_id, parent_comment_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_cc_thread_created ON community_comments(thread_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_cc_author ON community_comments(author_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cc_mod_status ON community_comments(moderation_status, created_at DESC);

    CREATE TABLE IF NOT EXISTS community_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, target_type, target_id, kind)
    );
    CREATE INDEX IF NOT EXISTS idx_cr_target ON community_reactions(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_cr_user_recent ON community_reactions(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS community_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      resolved_by TEXT,
      resolution TEXT,
      triggered_hide INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cr_target_open ON community_reports(target_type, target_id, resolved_at);
    CREATE INDEX IF NOT EXISTS idx_cr_reporter ON community_reports(reporter_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cr_open ON community_reports(resolved_at) WHERE resolved_at IS NULL;

    CREATE TABLE IF NOT EXISTS community_mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      mentioned_id TEXT NOT NULL,
      raw_token TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(source_type, source_id, mentioned_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cm_mentioned ON community_mentions(mentioned_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cm_source ON community_mentions(source_type, source_id);

    CREATE TABLE IF NOT EXISTS community_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      read_at INTEGER,
      UNIQUE(user_id, dedupe_key)
    );
    CREATE INDEX IF NOT EXISTS idx_cnot_user_unread ON community_notifications(user_id, read_at);
    CREATE INDEX IF NOT EXISTS idx_cnot_user_recent ON community_notifications(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS community_moderation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      queue_reason TEXT NOT NULL,
      context_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      resolved_by TEXT,
      resolution TEXT,
      priority INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cmq_unresolved ON community_moderation_queue(resolved_at, priority DESC);
    CREATE INDEX IF NOT EXISTS idx_cmq_target ON community_moderation_queue(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_cmq_reason_open ON community_moderation_queue(queue_reason, resolved_at);

    CREATE TABLE IF NOT EXISTS community_user_suspensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      triggered_by_report_id INTEGER,
      suspended_at INTEGER NOT NULL,
      suspended_until INTEGER NOT NULL,
      lifted_at INTEGER,
      lifted_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_csus_user ON community_user_suspensions(user_id, suspended_at DESC);
    CREATE INDEX IF NOT EXISTS idx_csus_active ON community_user_suspensions(suspended_until, lifted_at) WHERE lifted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_csus_user_active ON community_user_suspensions(user_id, lifted_at) WHERE lifted_at IS NULL;
  `);

  // T40: migration for existing portfolios tables that predate cash_balance.
  // SQLite supports `ALTER TABLE ADD COLUMN` with a constant default, so we
  // backfill any pre-existing rows with STARTING_CASH_CAD. Safe to run on
  // every init — SQLite no-ops the ALTER if the column already exists.
  try {
    db.exec(`ALTER TABLE portfolios ADD COLUMN cash_balance REAL NOT NULL DEFAULT 100000`);
  } catch {
    // Column already exists — that's the happy path after first migration.
  }
  // T41: same pattern for starting_cash. Backfills any pre-existing rows
  // with 100000 so the "Started at $X" badge shows the correct historical
  // default for portfolios created before this column existed.
  try {
    db.exec(`ALTER TABLE portfolios ADD COLUMN starting_cash REAL NOT NULL DEFAULT 100000`);
  } catch {
    // Column already exists — that's the happy path after first migration.
  }
}

export function uuid(): string {
  return crypto.randomUUID();
}
