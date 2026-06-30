// POST /api/arena/credits/claim-daily — claim the daily login bonus.
// Idempotent per UTC day.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { claimDailyLogin } from '@/lib/arena/credits';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const isSubscriber = !!body?.isSubscriber;
  const result = claimDailyLogin({ userId: user.id, isSubscriber });
  if (!result.ok) return NextResponse.json({ ok: false, error: 'Could not claim.' }, { status: 400 });
  return NextResponse.json(result);
}