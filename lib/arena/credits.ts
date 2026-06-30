// T42: ARENA credits engine — single source of truth for the credit
// economy. All earn/spend flows go through here so the ledger stays
// consistent. Backed by `credit_balances` + `credit_transactions`.
//
// Economics (locked from task body §Credit Economy):
//   1,000 credits = $1 CAD.
//   Free tier:        5cr standard / 15cr premium / 25cr daily / 100 cr/mo login
//   $5/mo sub:        5cr / 12cr / 30cr daily / 3,000 cr/mo grant
//   $5 starter pack:  5cr / 15cr / 25cr daily / 5,000 cr one-time
//   12-month expiry on credits earned. No conversion on opt-out.
//
// In v1 there is no real-money top-up — all grants are issued by the
// platform (mock purchases) so the prototype runs end-to-end without a
// payment processor. Production-ready hook point: `issuePack` and
// `startSubscription` would call Stripe; for now they just credit.

import { getDb, uuid } from '../db';

export const CREDITS_PER_CAD_CENT = 10; // 1,000 cr = $1 CAD
export const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

// Daily login bonus (4:30pm ET per task body). Auto-claimable from
// any page; only credits once per UTC day.
export const DAILY_LOGIN_FREE = 25;
export const DAILY_LOGIN_SUB = 30;

// Pricing constants for packs / subs — exposed so the credit-pack UI
// can render without reaching into private numbers.
export const SUB_MONTHLY_GRANT = 3000;
export const SUB_PRICE_CAD_CENTS = 500; // $5
export const STARTER_PACK_GRANT = 5000;
export const STARTER_PACK_PRICE_CAD_CENTS = 500; // $5

export type CreditKind =
  | 'login_bonus'
  | 'challenge_stake'
  | 'challenge_payout'
  | 'challenge_refund'
  | 'starter_pack'
  | 'sub_grant'
  | 'merch_redemption'
  | 'adjustment';

export type Balance = {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
};

export type Transaction = {
  id: number;
  user_id: string;
  kind: CreditKind;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  created_at: number;
  expires_at: number;
};

function ensureBalanceRow(userId: string): void {
  const db = getDb();
  const row = db.prepare('SELECT user_id FROM credit_balances WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare(
      'INSERT INTO credit_balances (user_id, balance, lifetime_earned, lifetime_spent, updated_at) VALUES (?, 0, 0, 0, ?)'
    ).run(userId, Date.now());
  }
}

export function getBalance(userId: string): Balance {
  ensureBalanceRow(userId);
  const row = getDb()
    .prepare('SELECT user_id, balance, lifetime_earned, lifetime_spent FROM credit_balances WHERE user_id = ?')
    .get(userId) as Balance;
  return row;
}

export function listRecentTransactions(userId: string, limit = 20): Transaction[] {
  return getDb()
    .prepare(
      'SELECT id, user_id, kind, amount, balance_after, reference_id, description, created_at, expires_at FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    )
    .all(userId, limit) as Transaction[];
}

/**
 * Apply a credit change atomically. Positive amount = credit (earn).
 * Negative amount = debit (spend). Throws if the post-debit balance
 * would go below zero. Returns the new balance and the inserted
 * transaction row.
 */
export function applyTransaction(args: {
  userId: string;
  kind: CreditKind;
  amount: number;
  referenceId?: string;
  description?: string;
}): { balance: number; transactionId: number } {
  const db = getDb();
  ensureBalanceRow(args.userId);
  const now = Date.now();
  const expiresAt = args.amount > 0 ? now + TWELVE_MONTHS_MS : 0;
  const tx = db.transaction(() => {
    const row = db
      .prepare('SELECT balance FROM credit_balances WHERE user_id = ?')
      .get(args.userId) as { balance: number };
    const newBalance = row.balance + args.amount;
    if (newBalance < 0) {
      throw new Error(
        `Not enough credits for this action. You have ${row.balance} cr; need ${Math.abs(args.amount)} cr.`
      );
    }
    const ins = db
      .prepare(
        `INSERT INTO credit_transactions (user_id, kind, amount, balance_after, reference_id, description, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        args.userId,
        args.kind,
        args.amount,
        newBalance,
        args.referenceId ?? null,
        args.description ?? null,
        now,
        expiresAt
      );
    db.prepare('UPDATE credit_balances SET balance = ?, updated_at = ? WHERE user_id = ?').run(
      newBalance,
      now,
      args.userId
    );
    if (args.amount > 0) {
      db.prepare(
        'UPDATE credit_balances SET lifetime_earned = lifetime_earned + ? WHERE user_id = ?'
      ).run(args.amount, args.userId);
    } else {
      db.prepare(
        'UPDATE credit_balances SET lifetime_spent = lifetime_spent + ? WHERE user_id = ?'
      ).run(-args.amount, args.userId);
    }
    return { transactionId: Number(ins.lastInsertRowid), balance: newBalance };
  });
  return tx();
}

/**
 * Daily login bonus — claim once per UTC day. Idempotent: returns
 * { alreadyClaimed: true } if already claimed today. Tier is read
 * from the caller (free vs subscriber). 4:30pm ET timing is enforced
 * server-side by comparing UTC date; the cron job that calls this
 * is responsible for the ET time-of-day check.
 */
export function claimDailyLogin(args: {
  userId: string;
  isSubscriber: boolean;
}): { ok: true; balance: number; awarded: number; alreadyClaimed: boolean } {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM credit_transactions
       WHERE user_id = ? AND kind = 'login_bonus'
         AND date(created_at / 1000, 'unixepoch') = date('now')
       LIMIT 1`
    )
    .get(args.userId) as { id: number } | undefined;
  if (existing) {
    return { ok: true, balance: getBalance(args.userId).balance, awarded: 0, alreadyClaimed: true };
  }
  const award = args.isSubscriber ? DAILY_LOGIN_SUB : DAILY_LOGIN_FREE;
  const result = applyTransaction({
    userId: args.userId,
    kind: 'login_bonus',
    amount: award,
    description: `Daily login bonus (${args.isSubscriber ? 'subscriber' : 'free tier'})`,
  });
  return { ok: true, balance: result.balance, awarded: award, alreadyClaimed: false };
}

/**
 * Issue the one-time starter pack. Idempotent — only credits once per
 * user. Returns { ok: true, alreadyIssued } on second call.
 */
export function issueStarterPack(userId: string): { ok: true; awarded: number; alreadyIssued: boolean } {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM credit_transactions WHERE user_id = ? AND kind = 'starter_pack' LIMIT 1`)
    .get(userId) as { id: number } | undefined;
  if (existing) return { ok: true, awarded: 0, alreadyIssued: true };
  applyTransaction({
    userId,
    kind: 'starter_pack',
    amount: STARTER_PACK_GRANT,
    description: `Starter pack — $${STARTER_PACK_PRICE_CAD_CENTS / 100}`,
  });
  return { ok: true, awarded: STARTER_PACK_GRANT, alreadyIssued: false };
}

/**
 * Issue the monthly subscription grant. Idempotent per UTC month.
 * Returns whether the grant was newly applied this call.
 */
export function issueSubscriptionGrant(userId: string): { ok: true; awarded: number; alreadyIssued: boolean } {
  const db = getDb();
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const existing = db
    .prepare(
      `SELECT id FROM credit_transactions WHERE user_id = ? AND kind = 'sub_grant'
         AND strftime('%Y-%m', created_at / 1000, 'unixepoch') = strftime('%Y-%m', 'now')
       LIMIT 1`
    )
    .get(userId) as { id: number } | undefined;
  if (existing) return { ok: true, awarded: 0, alreadyIssued: true };
  applyTransaction({
    userId,
    kind: 'sub_grant',
    amount: SUB_MONTHLY_GRANT,
    description: `Monthly subscriber grant (${monthKey})`,
  });
  return { ok: true, awarded: SUB_MONTHLY_GRANT, alreadyIssued: false };
}

/**
 * Sum a user's credit earnings over the current ISO week (Mon-Sun UTC).
 * Used for the weekly leaderboard — leaderboards never read individual
 * transactions directly; they call this helper to keep the roll-up
 * logic in one place.
 */
export function weeklyEarnedCr(userId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS s
         FROM credit_transactions
        WHERE user_id = ? AND amount > 0
          AND strftime('%Y-%W', created_at / 1000, 'unixepoch') = strftime('%Y-%W', 'now')`
    )
    .get(userId) as { s: number };
  return row.s;
}

/**
 * Sweep credits whose expires_at has passed. Removes them from the
 * balance by posting a negative adjustment. Safe to call repeatedly;
 * no-op if there's nothing expired.
 *
 * Returns the total credits expired across all users this call.
 */
export function sweepExpiredCredits(now: number = Date.now()): { expiredTotal: number; usersAffected: number } {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT user_id, COALESCE(SUM(amount), 0) AS expiring
         FROM credit_transactions
        WHERE expires_at > 0 AND expires_at <= ?
        GROUP BY user_id`
    )
    .all(now) as { user_id: string; expiring: number }[];
  let totalExpired = 0;
  let affected = 0;
  for (const r of rows) {
    if (r.expiring <= 0) continue;
    try {
      applyTransaction({
        userId: r.user_id,
        kind: 'adjustment',
        amount: -r.expiring,
        description: 'Credit expiry — 12-month inactivity rule',
      });
      totalExpired += r.expiring;
      affected += 1;
      // Mark the expiring rows as 'used' by zeroing their expires_at so
      // they don't double-sweep. Cheaper than tracking which rows were
      // applied — and harmless if a row was already 0.
      db.prepare(
        'UPDATE credit_transactions SET expires_at = 0 WHERE user_id = ? AND expires_at > 0 AND expires_at <= ?'
      ).run(r.user_id, now);
    } catch {
      // ignore — user might have spent their credits before sweep
    }
  }
  return { expiredTotal: totalExpired, usersAffected: affected };
}

/**
 * Compute the total credits a player has won across all challenge
 * payouts. Used for the all-time player leaderboard.
 */
export function lifetimeChallengePayoutsCr(userId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS s
         FROM credit_transactions
        WHERE user_id = ? AND kind = 'challenge_payout'`
    )
    .get(userId) as { s: number };
  return row.s;
}

export function formatCredits(n: number): string {
  // Format with thousand separators, no decimals — credits are integer-valued.
  return `${n.toLocaleString('en-CA')} cr`;
}

// Re-export uuid so callers don't have to import from db.ts separately.
export { uuid };