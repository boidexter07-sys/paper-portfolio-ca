// T42: ARENA merch redemption. Placeholder Giftbit integration per
// task body — if the GIFTBIT_API_KEY env var is unset (which it is
// for v1), every redemption auto-succeeds with a mock id. When the
// real API key is dropped in, swap the mock branch for a real fetch.

import { getDb, uuid } from '../db';
import { applyTransaction, getBalance } from './credits';

export type MerchItem = {
  key: string;
  name: string;
  description: string;
  credits: number;          // cost in credits
  icon: string;             // emoji used on the page
  category: 'gift_card' | 'merch' | 'donation';
};

export type RedemptionRow = {
  id: string;
  user_id: string;
  item_key: string;
  item_name: string;
  credits_spent: number;
  status: 'submitted' | 'fulfilled' | 'failed';
  giftbit_request_id: string | null;
  note: string | null;
  created_at: number;
};

// Locked v1 catalog. Items map to common Giftbit SKUs (the real API
// would resolve by SKU at fulfillment time).
export const MERCH_CATALOG: MerchItem[] = [
  { key: 'gift_card_5',   name: '$5 gift card',    description: 'Major retailer gift card', credits: 5_000,  icon: '🎁', category: 'gift_card' },
  { key: 'gift_card_10',  name: '$10 gift card',   description: 'Major retailer gift card', credits: 10_000, icon: '🎁', category: 'gift_card' },
  { key: 'gift_card_25',  name: '$25 gift card',   description: 'Major retailer gift card', credits: 25_000, icon: '🎁', category: 'gift_card' },
  { key: 'gift_card_50',  name: '$50 gift card',   description: 'Major retailer gift card', credits: 50_000, icon: '🎁', category: 'gift_card' },
  { key: 't_shirt',       name: 'T-shirt',         description: 'Logo tee — sizes S–XXL',    credits: 15_000, icon: '👕', category: 'merch' },
  { key: 'mug',           name: 'Ceramic mug',     description: 'Logo mug, 12oz',            credits: 8_000,  icon: '☕', category: 'merch' },
  { key: 'sticker_pack',  name: 'Sticker pack',    description: '5 vinyl stickers',          credits: 2_000,  icon: '✨', category: 'merch' },
  { key: 'donation_5',    name: '$5 donation',     description: 'Charity donation',          credits: 5_000,  icon: '🤝', category: 'donation' },
];

function db() {
  return getDb();
}

function nowMs() {
  return Date.now();
}

export function getMerchItem(key: string): MerchItem | null {
  return MERCH_CATALOG.find((m) => m.key === key) ?? null;
}

export function listUserRedemptions(userId: string, limit = 20): RedemptionRow[] {
  return db()
    .prepare(
      `SELECT id, user_id, item_key, item_name, credits_spent, status, giftbit_request_id, note, created_at
         FROM merch_redemptions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?`
    )
    .all(userId, limit) as RedemptionRow[];
}

/**
 * Request a redemption. Idempotent at the credits layer — the
 * applyTransaction call is the atomic boundary. If Giftbit is
 * configured, we'd post to it here and only mark fulfilled on a
 * 200 response. In placeholder mode, we always fulfill.
 */
export function requestRedemption(args: {
  userId: string;
  itemKey: string;
}): { ok: true; redemption: RedemptionRow; balance: number } | { ok: false; error: string } {
  const item = getMerchItem(args.itemKey);
  if (!item) return { ok: false, error: 'Unknown item.' };
  const balance = getBalance(args.userId).balance;
  if (balance < item.credits) {
    return { ok: false, error: `You have ${balance.toLocaleString('en-CA')} cr; this item costs ${item.credits.toLocaleString('en-CA')} cr.` };
  }
  const id = uuid();
  const now = nowMs();
  const isMock = !process.env.GIFTBIT_API_KEY;
  const giftbitRequestId = isMock ? `mock_${id}` : null;
  const note = isMock
    ? 'Placeholder fulfillment — Giftbit integration pending.'
    : null;
  const status: RedemptionRow['status'] = isMock ? 'fulfilled' : 'submitted';

  try {
    const tx = db().transaction(() => {
      applyTransaction({
        userId: args.userId,
        kind: 'merch_redemption',
        amount: -item.credits,
        referenceId: id,
        description: `Redeem: ${item.name}`,
      });
      db().prepare(
        `INSERT INTO merch_redemptions (id, user_id, item_key, item_name, credits_spent, status, giftbit_request_id, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, args.userId, item.key, item.name, item.credits, status, giftbitRequestId, note, now);
    });
    tx();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not redeem item.';
    return { ok: false, error: msg };
  }
  const redemption = db()
    .prepare(
      `SELECT id, user_id, item_key, item_name, credits_spent, status, giftbit_request_id, note, created_at
         FROM merch_redemptions WHERE id = ?`
    )
    .get(id) as RedemptionRow;
  return { ok: true, redemption, balance: getBalance(args.userId).balance };
}

/**
 * Pretty-print a credits amount in CAD for the merch page (e.g.
 * 25,000 cr → "$25.00"). 1,000 cr = $1 CAD per the locked rate.
 */
export function formatCrToCad(credits: number): string {
  const dollars = credits / 1000;
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}