// T43: POST /api/walkthrough/complete
//
// Marks the current user's walkthrough as completed (sets
// users.walkthrough_completed_at to now). Idempotent \u2014 re-running
// just refreshes the timestamp.
//
// Auth: signed in only. Returns 401 if no session.
//
// Body (optional): { reset?: boolean } \u2014 when truthy, clears the
// timestamp instead of setting it. Used by the "Restart walkthrough"
// button in /account.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { markWalkthroughComplete, resetWalkthrough } from '@/lib/walkthrough.server';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  let reset = false;
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && body.reset === true) reset = true;
  } catch {
    // Empty body or non-JSON \u2014 default to "complete" semantics.
  }

  if (reset) {
    resetWalkthrough(user.id);
    return NextResponse.json({ ok: true, reset: true });
  }

  const ts = markWalkthroughComplete(user.id);
  return NextResponse.json({ ok: true, walkthrough_completed_at: ts });
}
