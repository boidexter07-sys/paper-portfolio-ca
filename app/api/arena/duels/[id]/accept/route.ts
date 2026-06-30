// POST /api/arena/duels/[id]/accept — accept a pending Clan Duel invite.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { acceptInvite } from '@/lib/arena/duels';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const result = acceptInvite({ inviteId: id, acceptingUserId: user.id });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, challengeId: result.challengeId });
}