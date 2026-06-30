// POST /api/arena/challenges/cancel — cancel an open challenge. Only
// the creator can call this. Refunds all participants.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cancelChallenge } from '@/lib/arena/challenges';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const challengeId = body?.challengeId as string | undefined;
  if (!challengeId) {
    return NextResponse.json({ ok: false, error: 'challengeId is required.' }, { status: 400 });
  }
  const result = cancelChallenge({ userId: user.id, challengeId });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, refunded: result.refunded });
}