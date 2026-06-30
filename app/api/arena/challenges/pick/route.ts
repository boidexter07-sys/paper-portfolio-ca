// POST /api/arena/challenges/pick — set the user's pick on a live
// individual challenge. Stored on the challenge row's `theme` column
// as JSON for v1 simplicity. C1-C7 only.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { setIndividualPick } from '@/lib/arena/scoring';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const challengeId = body?.challengeId as string | undefined;
  const pick = body?.pick;
  if (!challengeId || !pick) {
    return NextResponse.json({ ok: false, error: 'challengeId and pick are required.' }, { status: 400 });
  }
  const result = setIndividualPick({ userId: user.id, challengeId, pick });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}