// POST /api/arena/duels/invite — send a Clan Duel invite from clan A
// (led by the calling user) to clan B. Compressed-timing defaults
// (2h accept / 2h roster / 4h build) are enforced server-side.
//
// Body: {
//   clanBId: string,
//   durationDays: 1 | 3 | 7,
//   rosterSize: number,        // 10-20
//   stakePerMember: number,    // 10-100 cr
//   theme: string,             // sector / exchange / custom name
//   metric: 'M1'..'M15'
// }

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendInvite } from '@/lib/arena/duels';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const clanAId = body?.clanAId as string | undefined;
  const clanBId = body?.clanBId as string | undefined;
  const durationDays = body?.durationDays as number | undefined;
  const rosterSize = body?.rosterSize as number | undefined;
  const stakePerMember = body?.stakePerMember as number | undefined;
  const theme = body?.theme as string | undefined;
  const metric = body?.metric as string | undefined;
  if (!clanAId || !clanBId) {
    return NextResponse.json({ ok: false, error: 'clanAId and clanBId are required.' }, { status: 400 });
  }
  if (!durationDays || ![1, 3, 7].includes(durationDays)) {
    return NextResponse.json({ ok: false, error: 'Duration must be 1, 3, or 7 days.' }, { status: 400 });
  }
  if (!rosterSize || rosterSize < 10 || rosterSize > 20) {
    return NextResponse.json({ ok: false, error: 'Roster size must be 10-20.' }, { status: 400 });
  }
  if (!stakePerMember || stakePerMember < 10 || stakePerMember > 100) {
    return NextResponse.json({ ok: false, error: 'Stake must be 10-100 cr per member.' }, { status: 400 });
  }
  if (!theme || !metric) {
    return NextResponse.json({ ok: false, error: 'theme and metric are required.' }, { status: 400 });
  }
  const result = sendInvite({
    inviterUserId: user.id,
    clanAId,
    clanBId,
    durationDays,
    rosterSize,
    stakePerMember,
    theme,
    metric,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, inviteId: result.inviteId });
}