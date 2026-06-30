// POST /api/arena/challenges/create — create an open group challenge
// (G1-G4). The creator becomes the first participant.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createGroupChallenge } from '@/lib/arena/challenges';
import { listUserClans } from '@/lib/arena/clans';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = body?.kind as 'G1' | 'G2' | 'G3' | 'G4' | undefined;
  if (!kind) return NextResponse.json({ ok: false, error: 'kind is required.' }, { status: 400 });
  const userClans = listUserClans(user.id);
  const clanId = userClans[0]?.id ?? null;
  const isSubscriber = !!body?.isSubscriber;
  const result = createGroupChallenge({ userId: user.id, kind, clanId, isSubscriber });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, challengeId: result.challengeId });
}