// POST /api/community/mod/users/unsuspend
//
// Body: { userId: string, note?: string }
//
// Mod-only. Lifts any active manual suspension on a user. Sets
// `lifted_at` on every open `community_user_suspensions` row for the
// user (including the `reason='manual'` ones), clears
// `users.is_suspended_manually = 0`, and writes a `community_mod_log`
// row. Pattern-detection (`reason='pattern_3_reports_30d'`) suspensions
// are also lifted by this call — a deliberate mod action overrides
// any auto-path.

import { NextRequest, NextResponse } from 'next/server';
import { requireModerator, recordModAction } from '@/lib/community/mod';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const mod = await requireModerator();
  if (!mod) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: { userId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const userId = (body.userId || '').trim();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'invalid_userId' }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: string } | undefined;
  if (!user) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const now = Date.now();
  const liftedCount = (
    db
      .prepare(
        `UPDATE community_user_suspensions
         SET lifted_at = ?, lifted_by = ?
         WHERE user_id = ? AND lifted_at IS NULL`
      )
      .run(now, mod.id, userId)
  ).changes;
  db.prepare('UPDATE users SET is_suspended_manually = 0 WHERE id = ?').run(userId);

  recordModAction({
    modUserId: mod.id,
    action: 'user_unsuspended',
    targetType: 'user',
    targetId: userId,
    context: {
      lifted_count: liftedCount,
      note: body.note?.slice(0, 280) || null,
    },
  });

  return NextResponse.json({ ok: true, userId, liftedCount });
}
