// POST /api/arena/challenges/join — join an open group challenge (G1-G4).
// Body: { challengeId, isSubscriber }

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { joinGroupChallenge } from '@/lib/arena/challenges';
import { listUserClans } from '@/lib/arena/clans';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const challengeId = body?.challengeId as string | undefined;
  if (!challengeId) {
    return NextResponse.json({ ok: false, error: 'challengeId is required.' }, { status: 400 });
  }
  const isSubscriber = !!body?.isSubscriber;
  const userClans = listUserClans(user.id);
  const clanId = userClans[0]?.id ?? null;
  const result = joinGroupChallenge({ userId: user.id, challengeId, clanId, isSubscriber });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, live: result.live });
}