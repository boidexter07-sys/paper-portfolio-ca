import * as DatabaseNS from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

type Database = DatabaseNS.Database;
const Database = (DatabaseNS as unknown as { default: new (p: string, opts?: { readonly?: boolean; fileMustExist?: boolean }) => Database }).default ?? (DatabaseNS as unknown as new (p: string, opts?: { readonly?: boolean; fileMustExist?: boolean }) => Database);

// Canonical DB location: data/paperportfolio.db, next to the repo root.
//
// T46 update: previously this forked to /tmp/paperportfolio.db on Vercel
// (T45) because Vercel serverless functions have a read-only
// process.cwd() and only /tmp is writable. That worked for warm-instance
// writes but every cold start wiped the data and signup endpoints broke
// for fresh requests. To ship a populated demo, we now ship the
// pre-seeded DB file as part of the repo.
//
// Runtime FS behaviour:
//   - Local dev (process.cwd() writable, VERCEL unset): open read/write.
//     `npm run seed` and `npm run seed:friends` populate the file.
//   - Vercel (VERCEL=1 set): the runtime FS at /var/task is read-only.
//     better-sqlite3 in default mode tries to write the -wal / -shm side
//     files and throws SQLITE_READONLY. To get reads working from the
//     shipped DB, we open with `readonly: true, fileMustExist: true` —
//     which makes SQLite use the existing DB read-only with no side
//     files. Writes from API endpoints (signup, trade, post, reaction)
//     still throw, by design; this limitation is documented in
//     v13-build-report.md. Friends see a populated demo on every page
//     load; their actions silently no-op or 500 if they try to write.
//
// .gitignore: this file is in `data/*.db` (and negated via
// `!data/paperportfolio.db` for the shipped file).
const IS_VERCEL = !!process.env.VERCEL;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'paperportfolio.db');

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  // Vercel: open read-only against the shipped file. Local: read/write.
  const db = IS_VERCEL
    ? new Database(DB_PATH, { readonly: true, fileMustExist: true })
    : new Database(DB_PATH);
  if (!IS_VERCEL) {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db); // local: ensure schema; Vercel: shipped file already has it
  }
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
      acknowledged_first_signal INTEGER NOT NULL DEFAULT 0,
      -- T38: ARENA Community moderator flag. 1 = mod (Muse is the v1
      -- first mod; future mods flipped to 1 via DB update). Default 0.
      -- isModerator() reads this column directly.
      is_moderator INTEGER NOT NULL DEFAULT 0,
      -- T38: manual suspension flag. Set by mod action; cleared by
      -- unsuspend. Pattern-detection (Layer 4) uses the suspension log
      -- table instead, so the two paths stay independent.
      is_suspended_manually INTEGER NOT NULL DEFAULT 0,
      -- T43: ARENA User Guide + How-To-Play Walkthrough. Timestamp set
      -- the first time a user dismisses or completes the 6-step
      -- walkthrough; NULL until they finish. The /layout reads it to
      -- decide whether to mount WalkthroughHighlight; /account exposes
      -- a "Restart walkthrough" button that clears it (NULL) again.
      -- Stored as ms-since-epoch to match created_at elsewhere.
      walkthrough_completed_at INTEGER
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

    -- =================================================================
    -- community_mod_log — append-only audit trail of every moderator
    -- action. Written by every mod-only API endpoint. Reviewable in
    -- the mod UI when it ships (T39).
    -- =================================================================
    CREATE TABLE IF NOT EXISTS community_mod_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mod_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      context_json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cml_mod ON community_mod_log(mod_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cml_action ON community_mod_log(action, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cml_target ON community_mod_log(target_type, target_id);

    -- =================================================================
    -- T42: ARENA v1 — Challenges engine, clans, leaderboards, credits,
    -- challenge portfolios, merch redemption.
    -- 11 tables. ALL challenge activity happens in these tables —
    -- main paper portfolios never touched by ARENA.
    -- =================================================================

    -- challenges: one row per challenge instance (C1-C7, G1-G4, G7).
    -- kind discriminates the catalog type. status covers the lifecycle:
    --   open            — accepting participants (group challenges)
    --   live            — actively scoring (between start and end)
    --   settled         — done, payout recorded
    --   cancelled       — pre-start cancellation (refund)
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,               -- C1, C2, ... C7, G1, G2, G3, G4, G7
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      theme TEXT,                        -- sector/exchange/custom for clan duel
      metric TEXT,                       -- M1..M15 for clan duel
      roster_size INTEGER NOT NULL DEFAULT 1,
      stake_free INTEGER NOT NULL,       -- credits for free tier
      stake_sub INTEGER NOT NULL,        -- credits for subscriber tier
      multiplier REAL NOT NULL,          -- locked multiplier for the challenge
      duration_days INTEGER NOT NULL,    -- 1..7
      starts_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      clan_a_id TEXT,                    -- for clan vs clan challenges (G2, G3, G7)
      clan_b_id TEXT,
      winner_clan_id TEXT,               -- populated on settle
      -- Clan Duel (G7) compressed-timing fields
      accept_deadline INTEGER,           -- 2h after T-0
      roster_lock_deadline INTEGER,      -- 2h after accept
      build_deadline INTEGER,            -- 4h after roster lock
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      settled_at INTEGER,
      final_score_a REAL,
      final_score_b REAL,
      rake_credits INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_ch_status_ends ON challenges(status, ends_at);
    CREATE INDEX IF NOT EXISTS idx_ch_kind_status ON challenges(kind, status);
    CREATE INDEX IF NOT EXISTS idx_ch_created_by ON challenges(created_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ch_clan_a ON challenges(clan_a_id);
    CREATE INDEX IF NOT EXISTS idx_ch_clan_b ON challenges(clan_b_id);

    -- challenge_participants: user <-> challenge join.
    -- For individual challenges there is exactly 1 row per participant.
    -- For group challenges (G1-G4, G7) there can be many.
    CREATE TABLE IF NOT EXISTS challenge_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      clan_id TEXT,                      -- set for group challenges
      role TEXT NOT NULL DEFAULT 'member', -- 'member' or 'leader' (G7 leaders only)
      stake_paid INTEGER NOT NULL,
      payout INTEGER NOT NULL DEFAULT 0,  -- credits paid out on settle (0 if lost)
      result TEXT NOT NULL DEFAULT 'pending', -- pending, won, lost, draw
      joined_at INTEGER NOT NULL,
      settled_at INTEGER,
      UNIQUE(challenge_id, user_id),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_cp_user ON challenge_participants(user_id, joined_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cp_challenge ON challenge_participants(challenge_id);
    CREATE INDEX IF NOT EXISTS idx_cp_clan ON challenge_participants(clan_id);

    -- clans: persistent group identity. Max 50 members per locked spec.
    CREATE TABLE IF NOT EXISTS clans (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      leader_user_id TEXT NOT NULL,
      member_count INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      total_credits_won INTEGER NOT NULL DEFAULT 0,
      weekly_credits_won INTEGER NOT NULL DEFAULT 0,
      week_started_at INTEGER NOT NULL,
      matchmaking_opt_in INTEGER NOT NULL DEFAULT 0,
      circle_vs_circle_enabled INTEGER NOT NULL DEFAULT 0,
      avatar_color TEXT NOT NULL DEFAULT 'sand'
    );
    CREATE INDEX IF NOT EXISTS idx_cl_name ON clans(name);
    CREATE INDEX IF NOT EXISTS idx_cl_weekly ON clans(weekly_credits_won DESC);

    -- clan_members: user <-> clan join. leader_user_id on clans is the founder.
    CREATE TABLE IF NOT EXISTS clan_members (
      clan_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', -- 'leader' or 'member'
      PRIMARY KEY (clan_id, user_id),
      FOREIGN KEY (clan_id) REFERENCES clans(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_cm_user ON clan_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_cm_clan ON clan_members(clan_id, joined_at);

    -- clan_leaderboards: denormalized roll-up for the per-clan board.
    -- One row per (clan, week_starting) for weekly; per (clan) for all-time.
    -- Updated on settlement.
    CREATE TABLE IF NOT EXISTS clan_leaderboards (
      clan_id TEXT NOT NULL,
      scope TEXT NOT NULL,         -- 'weekly' or 'alltime'
      period_key TEXT NOT NULL,    -- 'YYYY-WW' for weekly; 'all' for all-time
      total_credits_won INTEGER NOT NULL DEFAULT 0,
      challenge_wins INTEGER NOT NULL DEFAULT 0,
      member_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (clan_id, scope, period_key),
      FOREIGN KEY (clan_id) REFERENCES clans(id)
    );
    CREATE INDEX IF NOT EXISTS idx_clb_period ON clan_leaderboards(scope, period_key, total_credits_won DESC);

    -- credit_balances: one row per user. Updated atomically with every
    -- credit_transactions row.
    CREATE TABLE IF NOT EXISTS credit_balances (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      lifetime_earned INTEGER NOT NULL DEFAULT 0,
      lifetime_spent INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- credit_transactions: append-only ledger. Every credit earn/spend
    -- posts a row here. expiry_at powers the 12-month inactivity expiry.
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,          -- 'login_bonus', 'challenge_stake', 'challenge_payout',
                                  -- 'starter_pack', 'sub_grant', 'merch_redemption', 'adjustment'
      amount INTEGER NOT NULL,     -- positive credit, negative debit
      balance_after INTEGER NOT NULL,
      reference_id TEXT,           -- challenge_id, redemption_id, etc.
      description TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, -- +12 months from created_at for credits earned;
                                   -- 0 for debits (no expiry needed)
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_ct_user_recent ON credit_transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ct_user_expires ON credit_transactions(user_id, expires_at);

    -- merch_redemptions: one row per redemption request. Mock Giftbit
    -- always succeeds when no api key is configured (placeholder).
    CREATE TABLE IF NOT EXISTS merch_redemptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_key TEXT NOT NULL,      -- catalog key (e.g. 'gift_card_25')
      item_name TEXT NOT NULL,
      credits_spent INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'fulfilled', 'failed'
      giftbit_request_id TEXT,     -- populated on real integration (placeholder for now)
      note TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_mr_user ON merch_redemptions(user_id, created_at DESC);

    -- challenge_portfolios: ephemeral $50K paper portfolio per challenge
    -- acceptance. Distinct from main portfolios — main NEVER touched.
    -- Becomes read-only after the challenge ends_at passes.
    CREATE TABLE IF NOT EXISTS challenge_portfolios (
      id TEXT PRIMARY KEY,
      challenge_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      cash_balance REAL NOT NULL DEFAULT 50000,
      starting_cash REAL NOT NULL DEFAULT 50000,
      created_at INTEGER NOT NULL,
      locked_at INTEGER,           -- populated when challenge ends
      final_value REAL,            -- marked-to-market at end
      final_pnl REAL,
      UNIQUE(challenge_id, user_id),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_cpf_user ON challenge_portfolios(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cpf_challenge ON challenge_portfolios(challenge_id);

    -- challenge_portfolio_holdings: positions inside a challenge portfolio.
    CREATE TABLE IF NOT EXISTS challenge_portfolio_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_portfolio_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      quantity REAL NOT NULL,
      avg_cost REAL NOT NULL,
      FOREIGN KEY (challenge_portfolio_id) REFERENCES challenge_portfolios(id),
      FOREIGN KEY (ticker) REFERENCES stocks(ticker)
    );
    CREATE INDEX IF NOT EXISTS idx_cpfh_portfolio ON challenge_portfolio_holdings(challenge_portfolio_id);

    -- daily_score_snapshots: daily 4:30pm ET scoring for multi-day challenges.
    -- Source for the per-member daily score and clan aggregate display.
    CREATE TABLE IF NOT EXISTS daily_score_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      score REAL NOT NULL,
      snapshot_date TEXT NOT NULL,  -- YYYY-MM-DD ET
      cumulative_score REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(challenge_id, user_id, snapshot_date),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_dss_challenge ON daily_score_snapshots(challenge_id, snapshot_date);

    -- anti_cheat_log: lenient review queue. Logged when a player's win
    -- rate over their last 10+ settled challenges exceeds 70%. No auto
    -- action — surface for human review per task body.
    CREATE TABLE IF NOT EXISTS anti_cheat_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      window_size INTEGER NOT NULL,    -- number of challenges in the window
      win_rate REAL NOT NULL,          -- observed 0..1
      total_won INTEGER NOT NULL,
      total_played INTEGER NOT NULL,
      flagged_at INTEGER NOT NULL,
      reviewed_at INTEGER,
      reviewer_user_id TEXT,
      review_note TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_acl_user_recent ON anti_cheat_log(user_id, flagged_at DESC);
    CREATE INDEX IF NOT EXISTS idx_acl_unreviewed ON anti_cheat_log(reviewed_at) WHERE reviewed_at IS NULL;

    -- clan_duel_invites: invite flow for G7. leader_a_id sends invite to
    -- leader_b_id; 2h accept window. Once accepted, leader_b confirms.
    CREATE TABLE IF NOT EXISTS clan_duel_invites (
      id TEXT PRIMARY KEY,
      clan_a_id TEXT NOT NULL,
      clan_b_id TEXT NOT NULL,
      invited_by_user_id TEXT NOT NULL,
      accepted_by_user_id TEXT,
      challenge_id TEXT,               -- populated on accept (challenge created)
      status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,     -- 2h after created_at
      responded_at INTEGER,
      FOREIGN KEY (clan_a_id) REFERENCES clans(id),
      FOREIGN KEY (clan_b_id) REFERENCES clans(id)
    );
    CREATE INDEX IF NOT EXISTS idx_cdi_pending ON clan_duel_invites(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_cdi_clan_b ON clan_duel_invites(clan_b_id, status);
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

  // T38: ARENA Community. Backfill `is_moderator` and `is_suspended_manually`
  // on the users table. Safe to re-run on every init (ALTER ignores
  // re-adds). Both columns have a constant default of 0 so pre-existing
  // rows are non-moderator / non-suspended without any extra work.
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_moderator INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists.
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_suspended_manually INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists.
  }

  // T43: add walkthrough_completed_at to the users table on upgrade.
  // Unlike the moderator flags, this column is nullable (NULL = not yet
  // completed; a ms-since-epoch timestamp = completed at that time).
  // SQLite treats ALTER TABLE ADD COLUMN as a no-op if the column
  // already exists, so this is safe to re-run on every init — but the
  // try/catch is defensive against the older ALTER failing on tables
  // that pre-date the column.
  try {
    db.exec(`ALTER TABLE users ADD COLUMN walkthrough_completed_at INTEGER`);
  } catch {
    // Column already exists.
  }

  // T38: promote Muse (council member, content/voice) to the v1 first
  // moderator. Match by the MUSE_EMAIL env var first, then fall back to
  // the locked decisions email. If neither user exists in the DB yet,
  // the upgrade is a no-op — the next signup with the right email
  // becomes the mod (the upgrade-on-signup path is the v1 mechanism so
  // the column is set the moment Muse signs in, not at boot).
  const museEmails = [
    (process.env.MUSE_EMAIL || '').toLowerCase().trim(),
    'muse@paper-portfolio.ca', // locked by Taha decision §13.3
  ].filter(Boolean);
  for (const email of museEmails) {
    db.prepare('UPDATE users SET is_moderator = 1 WHERE LOWER(email) = ?').run(email);
  }
}

export function uuid(): string {
  return crypto.randomUUID();
}
