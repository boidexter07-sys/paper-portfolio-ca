// POST /api/community/mod/users/suspend
//
// Body: { userId: string, hours?: number, note?: string }
//
// Mod-only. Manually suspends a user (Taha decision §13.7a). Distinct
// from the 72h pattern-detection auto-suspend: this is a deliberate mod
// action. Default 72h to match the auto-suspend duration. Mods CANNOT
// ban permanently (per Taha decision §13.7a) — the maximum a single
// manual suspend can run is 30 days, but the practical ceiling is much
// lower (mod judgment; reviewable in the mod log).
//
// Side-effects:
//   - INSERT community_user_suspensions row (reason='manual')
//   - UPDATE users.is_suspended_manually = 1
//   - WRITE community_mod_log row
//
// The actions.ts `isUserSuspended()` helper checks both the active
// suspension log AND the manual flag, so the suspended user is blocked
// on the next write attempt.

import { NextRequest, NextResponse } from 'next/server';
import { requireModerator, recordModAction } from '@/lib/community/mod';
import { getDb } from '@/lib/db';

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_HOURS = 72;
const MAX_HOURS = 24 * 30; // 30 days — practical ceiling, not "permanent"

export async function POST(req: NextRequest) {
  const mod = await requireModerator();
  if (!mod) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: { userId?: string; hours?: number; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const userId = (body.userId || '').trim();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'invalid_userId' }, { status: 400 });
  }
  if (userId === mod.id) {
    // A mod cannot suspend themselves. (Trust-but-verify; another mod
    // can do it if it's ever needed.)
    return NextResponse.json({ ok: false, error: 'cannot_suspend_self' }, { status: 400 });
  }
  const hours = Math.min(Math.max(Number(body.hours || DEFAULT_HOURS), 1), MAX_HOURS);

  const db = getDb();
  const user = db.prepare('SELECT id, is_moderator FROM users WHERE id = ?').get(userId) as
    | { id: string; is_moderator: number }
    | undefined;
  if (!user) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  if (user.is_moderator === 1) {
    return NextResponse.json({ ok: false, error: 'cannot_suspend_moderator' }, { status: 400 });
  }

  const now = Date.now();
  const suspendedUntil = now + hours * HOUR_MS;
  db.prepare(
    `INSERT INTO community_user_suspensions (user_id, reason, suspended_at, suspended_until)
     VALUES (?, 'manual', ?, ?)`
  ).run(userId, now, suspendedUntil);
  db.prepare('UPDATE users SET is_suspended_manually = 1 WHERE id = ?').run(userId);

  recordModAction({
    modUserId: mod.id,
    action: 'user_suspended',
    targetType: 'user',
    targetId: userId,
    context: {
      hours,
      suspended_until: suspendedUntil,
      note: body.note?.slice(0, 280) || null,
    },
  });

  return NextResponse.json({ ok: true, userId, suspendedUntil, hours });
}
