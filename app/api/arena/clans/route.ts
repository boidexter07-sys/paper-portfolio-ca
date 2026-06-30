// POST /api/arena/clans — create a clan. Body: { name, description?, avatarColor? }

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClan, CLAN_LIMITS } from '@/lib/arena/clans';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name : '';
  if (name.length < CLAN_LIMITS.NAME_MIN) {
    return NextResponse.json({ ok: false, error: `Clan name must be at least ${CLAN_LIMITS.NAME_MIN} characters.` }, { status: 400 });
  }
  if (name.length > CLAN_LIMITS.NAME_MAX) {
    return NextResponse.json({ ok: false, error: `Clan name must be ${CLAN_LIMITS.NAME_MAX} characters or fewer.` }, { status: 400 });
  }
  const result = createClan({
    userId: user.id,
    name,
    description: typeof body?.description === 'string' ? body.description : undefined,
    avatarColor: typeof body?.avatarColor === 'string' ? body.avatarColor : undefined,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, clanId: result.clanId });
}