// POST /api/arena/challenges/accept — accept an individual challenge
// (C1-C7). Deducts stake via the credits engine and creates the
// challenge portfolio. Idempotent per (kind, userId) is NOT enforced
// here — the user can accept multiple C1s in a day if they want.
//
// Body: { kind: 'C1'..'C7', durationDays?: number (C5 only) }
// Returns: { ok: true, challengeId, portfolioId, stakeCr, multiplier }

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { acceptIndividualChallenge } from '@/lib/arena/challenges';
import { createChallengePortfolio } from '@/lib/arena/portfolios';
import { stakeFor, type ChallengeKind } from '@/lib/arena/catalog';

const INDIVIDUAL_KINDS: ChallengeKind[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = body?.kind as ChallengeKind | undefined;
  if (!kind || !INDIVIDUAL_KINDS.includes(kind)) {
    return NextResponse.json({ ok: false, error: 'Pick a valid challenge kind (C1-C7).' }, { status: 400 });
  }
  const isSubscriber = !!body?.isSubscriber;
  const durationDays = typeof body?.durationDays === 'number' ? body.durationDays : undefined;
  const result = acceptIndividualChallenge({
    userId: user.id,
    kind,
    isSubscriber,
    durationDays,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  // Create the matching challenge portfolio.
  const cpf = createChallengePortfolio({ challengeId: result.challengeId, userId: user.id });
  if (!cpf.ok) {
    return NextResponse.json({ ok: false, error: cpf.error }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    challengeId: result.challengeId,
    portfolioId: cpf.portfolio.id,
    stakeCr: stakeFor(kind, isSubscriber),
  });
}