// POST /api/arena/clans/[id]/matchmaking — toggle matchmaking opt-in
// (leader only). Body: { enabled: boolean, circleVsCircle?: boolean }

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { setMatchmakingOptIn } from '@/lib/arena/clans';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const enabled = !!body?.enabled;
  const circleVsCircle = !!body?.circleVsCircle;
  const result = setMatchmakingOptIn({
    userId: user.id,
    clanId: id,
    enabled,
    circleVsCircle,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}