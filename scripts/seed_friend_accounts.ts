// T46 seed: pre-create 5 simple shareable test accounts so Taha's friends
// can log in to the live Vercel URL and see a populated demo.
//
// Why this exists: Vercel's `/tmp` storage is ephemeral per serverless
// invocation, so `signup`/`login` only persists within a single warm
// instance. Cross-page navigation may land on a fresh instance with no
// record of the signup, so we'd never get a stable 5-account demo.
//
// Workaround: write the user records directly into
// `data/paperportfolio.db` and SHIP the DB file as part of the repo.
// On Vercel the repo files are read-only at runtime, but READS work — so
// friends hit a populated demo every time, even if their own writes
// (trades, posts) don't always persist. (Vercel writes are a known T46
// limitation, not a bug — flagged in v13-build-report.md.)
//
// Run via:   npm run seed:friends
//
// Idempotent: every INSERT uses ON CONFLICT or a pre-check keyed on
// natural keys (email, clan name, portfolio-by-user) so re-running is safe.

import { getDb } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { randomUUID } from 'crypto';

// =============================================================================
// 5 FRIEND ACCOUNTS — locked spec from kanban t_1e7dc0b9
// =============================================================================
const FRIENDS = [
  { email: 'alex@paperportfolio.ca',   display_name: 'Alex',   style: 'value',   starting_cash: 250_000,   ticker: 'RY'   },
  { email: 'sam@paperportfolio.ca',    display_name: 'Sam',    style: 'growth',  starting_cash: 500_000,   ticker: 'NVDA' },
  { email: 'jordan@paperportfolio.ca', display_name: 'Jordan', style: 'balanced',starting_cash: 100_000,   ticker: 'TD'   },
  { email: 'taylor@paperportfolio.ca', display_name: 'Taylor', style: 'growth',  starting_cash: 1_000_000, ticker: 'SHOP' },
  { email: 'morgan@paperportfolio.ca', display_name: 'Morgan', style: 'value',   starting_cash: 250_000,   ticker: 'ENB'  },
] as const;

const PASSWORD = 'Test1234';
const DEMO_CLAN_NAME = 'Demo Clan';
const DEMO_CLAN_DESCRIPTION = 'The five friends Taha invited to try Paper Portfolio. Sign in to see your demo portfolio, accept a challenge, and explore.';
const STARTING_CREDITS = 500;
const PORTFOLIO_NAME = 'Demo Paper Portfolio';

type FriendUser = {
  email: string;
  user_id: string;
  display_name: string;
  style: 'value' | 'growth' | 'balanced';
  starting_cash: number;
  ticker: string;
  qty: number;
  price: number;
};

type EventTemplate = { event_type: string; detail_template: (t: string) => string };
const eventSeed: EventTemplate[] = [
  { event_type: 'paper_buy',      detail_template: (t: string) => `bought shares of ${t} (paper)` },
  { event_type: 'watchlist_add',  detail_template: (t: string) => `added ${t} to watchlist` },
  { event_type: 'prism_followed', detail_template: (t: string) => `saved PRISM signal for ${t}` },
  { event_type: 'paper_sell',     detail_template: (t: string) => `sold shares of ${t} (paper)` },
];

function nowMs(): number {
  return Date.now();
}

function pickHoldingQty(price: number, cash: number): number {
  // Pick a holding that's ~8% of starting cash, rounded down to a whole share.
  // Kept simple so the seeded holding renders with a visible cost basis on
  // /portfolio, and the cost stays well inside the user's starting cash so
  // the dashboard doesn't show a confusing "cost > starting cash" picture.
  const targetSpend = cash * 0.08;
  const rawQty = Math.floor(targetSpend / price);
  return Math.max(1, rawQty);
}

function ensureStockExists(db: ReturnType<typeof getDb>, ticker: string): { cached_price: number; name: string } | null {
  const row = db
    .prepare('SELECT cached_price, name FROM stocks WHERE ticker = ?')
    .get(ticker) as { cached_price: number | null; name: string } | undefined;
  if (!row) return null;
  // For demo holdings, fall back to a notional $100 price if the seed left
  // cached_price null — keeps the holding renderable on /portfolio.
  return { cached_price: row.cached_price ?? 100, name: row.name };
}

function seedOnce() {
  const db = getDb();
  const createdAt = nowMs();
  const pwHash = hashPassword(PASSWORD); // scrypt — matches auth.ts

  // ---------------------------------------------------------------------
  // 1. USERS
  // ---------------------------------------------------------------------
  const upsertUser = db.prepare(
    `INSERT INTO users (id, email, password_hash, investing_style, created_at, acknowledged_first_signal, is_moderator, is_suspended_manually, walkthrough_completed_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, NULL)
     ON CONFLICT(email) DO UPDATE SET
       password_hash = excluded.password_hash,
       investing_style = excluded.investing_style`
  );
  const selectUser = db.prepare('SELECT id FROM users WHERE email = ?');
  const userIds: FriendUser[] = [];

  for (const f of FRIENDS) {
    const existing = selectUser.get(f.email) as { id: string } | undefined;
    if (existing) {
      // Already there from a previous run — refresh password hash + style
      // so the demo is always reproducible, but keep the same user id so
      // existing data references stay valid.
      upsertUser.run(existing.id, f.email, pwHash, f.style, createdAt);
      userIds.push({ email: f.email, user_id: existing.id, display_name: f.display_name, style: f.style, starting_cash: f.starting_cash, ticker: f.ticker, qty: 0, price: 0 });
      continue;
    }
    const id = randomUUID();
    upsertUser.run(id, f.email, pwHash, f.style, createdAt);
    userIds.push({ email: f.email, user_id: id, display_name: f.display_name, style: f.style, starting_cash: f.starting_cash, ticker: f.ticker, qty: 0, price: 0 });
  }

  // ---------------------------------------------------------------------
  // 2. PORTFOLIOS (one per friend, full unspent cash)
  // ---------------------------------------------------------------------
  const insertPortfolio = db.prepare(
    `INSERT INTO portfolios (id, user_id, name, style, created_at, cash_balance, starting_cash)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  );
  const selectPortfolio = db.prepare(
    `SELECT id FROM portfolios WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`
  );
  const portfolioIds: Record<string, string> = {};
  for (const u of userIds) {
    const existing = selectPortfolio.get(u.user_id) as { id: string } | undefined;
    if (existing) {
      // Refresh the cash balances + style on re-run so the demo is
      // always reproducible.
      db.prepare(
        `UPDATE portfolios SET cash_balance = ?, starting_cash = ?, style = ?, name = ? WHERE id = ?`
      ).run(u.starting_cash, u.starting_cash, u.style, PORTFOLIO_NAME, existing.id);
      portfolioIds[u.email] = existing.id;
      continue;
    }
    const id = randomUUID();
    insertPortfolio.run(id, u.user_id, PORTFOLIO_NAME, u.style, createdAt, u.starting_cash, u.starting_cash);
    portfolioIds[u.email] = id;
  }

  // ---------------------------------------------------------------------
  // 3. HOLDINGS (1 holding per friend — the named ticker, ~8% of cash)
  //    Cost basis is the spot price; we deliberately DON'T mutate
  //    cash_balance so the friend sees their full starting cash next to
  //    a fully-paid holding (cleaner demo than a negative cash position).
  //    The qty for each friend is stashed on the FriendUser so step 6
  //    (community event detail) can reuse the same number consistently.
  // ---------------------------------------------------------------------
  const clearHoldings = db.prepare(`DELETE FROM holdings WHERE portfolio_id = ?`);
  const insertHolding = db.prepare(
    `INSERT INTO holdings (portfolio_id, ticker, quantity, avg_cost) VALUES (?, ?, ?, ?)`
  );
  const insertTrade = db.prepare(
    `INSERT INTO trades (id, portfolio_id, ticker, side, quantity, price, trade_date)
     VALUES (?, ?, ?, 'buy', ?, ?, ?)`
  );
  const hasBuyTrade = db.prepare(
    `SELECT COUNT(*) AS n FROM trades WHERE portfolio_id = ? AND ticker = ? AND side = 'buy'`
  );

  for (const u of userIds) {
    const portfolioId = portfolioIds[u.email];
    let stock = ensureStockExists(db, u.ticker);
    if (!stock) {
      // Fallback: AAPL is guaranteed in the seeded universe; use it.
      const fallback = ensureStockExists(db, 'AAPL');
      if (!fallback) {
        console.warn(`  WARN: no stocks present at all — skipping holding for ${u.email}`);
        continue;
      }
      u.ticker = 'AAPL';
      stock = fallback;
    }
    const price = stock.cached_price;
    const qty = pickHoldingQty(price, u.starting_cash);
    u.qty = qty;
    u.price = price;
    clearHoldings.run(portfolioId);
    insertHolding.run(portfolioId, u.ticker, qty, price);
    // Only write the demo buy trade once per portfolio — the trade ledger
    // is append-only and recreating trades on every seed run would inflate
    // the count.
    const existingBuys = hasBuyTrade.get(portfolioId, u.ticker) as { n: number };
    if (existingBuys.n === 0) {
      insertTrade.run(randomUUID(), portfolioId, u.ticker, qty, price, createdAt);
    }
  }

  // ---------------------------------------------------------------------
  // 4. COMMUNITY DISPLAY NAMES (so @mentions + thread authors render)
  // ---------------------------------------------------------------------
  const upsertCommunityName = db.prepare(
    `INSERT INTO user_community (user_id, display_name, display_name_changed_at, thread_count, comment_count, reputation_score)
     VALUES (?, ?, NULL, 0, 0, 0)
     ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name`
  );
  for (const u of userIds) {
    upsertCommunityName.run(u.user_id, u.display_name);
  }

  // ---------------------------------------------------------------------
  // 5. ARENA CREDIT BALANCES (one row per friend, +500 free credits)
  // ---------------------------------------------------------------------
  const upsertCredits = db.prepare(
    `INSERT INTO credit_balances (user_id, balance, lifetime_earned, lifetime_spent, updated_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       balance = excluded.balance,
       lifetime_earned = excluded.lifetime_earned,
       updated_at = excluded.updated_at`
  );
  const insertCreditTxn = db.prepare(
    `INSERT INTO credit_transactions (user_id, kind, amount, balance_after, reference_id, description, created_at, expires_at)
     VALUES (?, 'starter_pack', ?, ?, NULL, 'Free starter credits for demo friends', ?, ?)`
  );
  for (const u of userIds) {
    upsertCredits.run(u.user_id, STARTING_CREDITS, STARTING_CREDITS, createdAt);
    const existingTxn = db.prepare(
      `SELECT id FROM credit_transactions WHERE user_id = ? AND kind = 'starter_pack' LIMIT 1`
    ).get(u.user_id);
    if (!existingTxn) {
      // 12-month expiry per locked T42 spec
      const expiresAt = createdAt + 365 * 24 * 60 * 60 * 1000;
      insertCreditTxn.run(u.user_id, STARTING_CREDITS, STARTING_CREDITS, createdAt, expiresAt);
    }
  }

  // ---------------------------------------------------------------------
  // 6. COMMUNITY EVENTS — feed needs content; one event per friend
  // ---------------------------------------------------------------------
  const insertEvent = db.prepare(
    `INSERT INTO community_events (ticker, event_type, actor_label, detail, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const eventExists = db.prepare(
    `SELECT id FROM community_events WHERE actor_label = ? AND ticker = ? LIMIT 1`
  );
  for (const u of userIds) {
    const actorLabel = u.display_name; // friends see their own name on events
    const evt = eventSeed[Math.abs(u.display_name.charCodeAt(0)) % eventSeed.length];
    const detail = evt.detail_template(u.ticker);
    // Skip if we already seeded an event for this friend+ticker
    if (eventExists.get(actorLabel, u.ticker)) continue;
    // Per-friend offset so events sort cleanly in the feed regardless of run order
    const offset = Math.abs(u.display_name.charCodeAt(0)) * 60_000;
    insertEvent.run(u.ticker, evt.event_type, actorLabel, detail, createdAt - offset);
  }

  // ---------------------------------------------------------------------
  // 7. DEMO CLAN — "Demo Clan" with all 5 as members; Alex is leader
  // ---------------------------------------------------------------------
  const findClan = db.prepare(`SELECT id, leader_user_id FROM clans WHERE name = ?`);
  const updateClan = db.prepare(
    `UPDATE clans SET description = ?, member_count = ? WHERE name = ?`
  );
  const insertClan = db.prepare(
    `INSERT INTO clans (id, name, description, leader_user_id, member_count, created_at,
       total_credits_won, weekly_credits_won, week_started_at,
       matchmaking_opt_in, circle_vs_circle_enabled, avatar_color)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, 'moss')`
  );
  const insertClanMember = db.prepare(
    `INSERT INTO clan_members (clan_id, user_id, joined_at, role) VALUES (?, ?, ?, ?)
     ON CONFLICT(clan_id, user_id) DO UPDATE SET role = excluded.role`
  );

  let clanId: string;
  const existingClan = findClan.get(DEMO_CLAN_NAME) as { id: string; leader_user_id: string } | undefined;
  if (existingClan) {
    clanId = existingClan.id;
    updateClan.run(DEMO_CLAN_DESCRIPTION, userIds.length, DEMO_CLAN_NAME);
  } else {
    const alex = userIds.find(u => u.email === 'alex@paperportfolio.ca')!;
    clanId = randomUUID();
    insertClan.run(
      clanId,
      DEMO_CLAN_NAME,
      DEMO_CLAN_DESCRIPTION,
      alex.user_id,
      userIds.length,
      createdAt,
      createdAt
    );
  }

  // Add Alex as leader (if not already), the rest as members
  for (const u of userIds) {
    const role = u.email === 'alex@paperportfolio.ca' ? 'leader' : 'member';
    insertClanMember.run(clanId, u.user_id, createdAt, role);
  }

  return { userIds, portfolioIds, clanId };
}

function main() {
  console.log('[seed:friends] starting — 5 friend accounts + demo data');
  const result = seedOnce();
  console.log('[seed:friends] done.');
  console.log('');
  console.log('  Accounts (password: Test1234):');
  for (const u of result.userIds) {
    const portfolioId = result.portfolioIds[u.email];
    console.log(`    - ${u.email.padEnd(32)} ${u.display_name.padEnd(8)} cash=$${u.starting_cash.toLocaleString()} portfolio=${portfolioId} holding=${u.ticker} (${u.qty} shares @ $${u.price.toFixed(2)})`);
  }
  console.log('');
  console.log(`  Clan: ${result.clanId} (${DEMO_CLAN_NAME})`);
  console.log('');
}

// CLI invocation
if (require.main === module) {
  main();
  process.exit(0);
}

export { seedOnce, FRIENDS, DEMO_CLAN_NAME };
