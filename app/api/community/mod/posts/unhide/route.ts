// POST /api/community/mod/posts/unhide
//
// Body: { targetType: 'thread' | 'comment', targetId: string }
//
// Mod-only. Clears `hidden_at` on a thread or comment. Used to reverse
// false-positive auto-hides (the 5-distinct-off-topic-reports path) or
// the first-report auto-hide when a mod decides the content is fine.
// Every call writes a row to community_mod_log.

import { NextRequest, NextResponse } from 'next/server';
import { requireModerator, recordModAction } from '@/lib/community/mod';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const mod = await requireModerator();
  if (!mod) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: { targetType?: string; targetId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const targetType = body.targetType;
  const targetId = (body.targetId || '').trim();
  if (targetType !== 'thread' && targetType !== 'comment') {
    return NextResponse.json({ ok: false, error: 'invalid_targetType' }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ ok: false, error: 'invalid_targetId' }, { status: 400 });
  }

  const table = targetType === 'thread' ? 'community_threads' : 'community_comments';
  const db = getDb();
  const row = db.prepare(`SELECT id, hidden_at FROM ${table} WHERE id = ?`).get(targetId) as
    | { id: string; hidden_at: number | null }
    | undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  if (!row.hidden_at) {
    return NextResponse.json({ ok: true, targetId, wasHidden: false });
  }

  db.prepare(`UPDATE ${table} SET hidden_at = NULL WHERE id = ?`).run(targetId);

  recordModAction({
    modUserId: mod.id,
    action: 'post_unhidden',
    targetType: targetType as 'thread' | 'comment',
    targetId,
    context: { note: body.note?.slice(0, 280) || null, previous_hidden_at: row.hidden_at },
  });

  return NextResponse.json({ ok: true, targetId, wasHidden: true });
}
