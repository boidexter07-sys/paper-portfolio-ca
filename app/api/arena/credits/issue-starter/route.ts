// POST /api/arena/credits/issue-starter — issue the one-time starter pack grant.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { issueStarterPack } from '@/lib/arena/credits';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const result = issueStarterPack(user.id);
  return NextResponse.json({ ok: result.ok, awarded: result.awarded, alreadyIssued: result.alreadyIssued });
}