// POST /api/arena/duels/[id]/roster — join the roster for an accepted
// Clan Duel. Roster member only.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { joinClanDuelRoster } from '@/lib/arena/duels';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const isSubscriber = !!body?.isSubscriber;
  const result = joinClanDuelRoster({ userId: user.id, challengeId: id, isSubscriber });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}