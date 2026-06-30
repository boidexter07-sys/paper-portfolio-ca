// POST /api/arena/merch/redeem — redeem credits for a merch item.
// Mock Giftbit integration: when no GIFTBIT_API_KEY env var is set,
// every redemption is auto-fulfilled with a mock request id.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requestRedemption, getMerchItem } from '@/lib/arena/merch';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const itemKey = body?.itemKey as string | undefined;
  if (!itemKey) return NextResponse.json({ ok: false, error: 'itemKey is required.' }, { status: 400 });
  const item = getMerchItem(itemKey);
  if (!item) return NextResponse.json({ ok: false, error: 'Unknown item.' }, { status: 400 });
  const result = requestRedemption({ userId: user.id, itemKey });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, redemption: result.redemption, balance: result.balance });
}