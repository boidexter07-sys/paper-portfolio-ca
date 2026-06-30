// POST /api/community/mod/queue/resolve
//
// Body: { queueItemId: number, resolution: 'approved' | 'rejected' | 'escalated' }
//
// Mod-only. Resolves a single moderation queue item. Side-effects:
//   - approved: target.published_at = now(), target.moderation_status = 'mod_approved'
//   - rejected: target.moderation_status = 'mod_rejected' (target stays invisible)
//   - escalated: queue item stays open but is flagged for the next mod review
// Every resolution writes a row to community_mod_log (Taha decision §13.3a).

import { NextRequest, NextResponse } from 'next/server';
import { requireModerator, recordModAction } from '@/lib/community/mod';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const mod = await requireModerator();
  if (!mod) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: { queueItemId?: number; resolution?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const queueItemId = Number(body.queueItemId);
  const resolution = body.resolution;
  if (!Number.isFinite(queueItemId) || queueItemId <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_queueItemId' }, { status: 400 });
  }
  if (resolution !== 'approved' && resolution !== 'rejected' && resolution !== 'escalated') {
    return NextResponse.json({ ok: false, error: 'invalid_resolution' }, { status: 400 });
  }

  const db = getDb();
  const item = db
    .prepare('SELECT id, target_type, target_id, queue_reason, context_json FROM community_moderation_queue WHERE id = ?')
    .get(queueItemId) as { id: number; target_type: string; target_id: string; queue_reason: string; context_json: string } | undefined;
  if (!item) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  if (resolution !== 'escalated') {
    // Resolved (approved/rejected). Mark the queue row and update the target.
    const now = Date.now();
    db.prepare(
      `UPDATE community_moderation_queue SET resolved_at = ?, resolved_by = ?, resolution = ? WHERE id = ?`
    ).run(now, mod.id, resolution, item.id);

    if (resolution === 'approved') {
      const table = item.target_type === 'thread' ? 'community_threads' : 'community_comments';
      db.prepare(`UPDATE ${table} SET published_at = ?, moderation_status = 'mod_approved' WHERE id = ?`).run(now, item.target_id);
    } else if (resolution === 'rejected') {
      const table = item.target_type === 'thread' ? 'community_threads' : 'community_comments';
      db.prepare(`UPDATE ${table} SET moderation_status = 'mod_rejected' WHERE id = ?`).run(item.target_id);
    }
  } else {
    // Escalated: bump the priority so the next mod sees it sooner.
    db.prepare(`UPDATE community_moderation_queue SET priority = priority + 25 WHERE id = ?`).run(item.id);
  }

  // Audit (Taha decision §13.3a).
  recordModAction({
    modUserId: mod.id,
    action: resolution === 'approved' ? 'queue_approved' : resolution === 'rejected' ? 'queue_rejected' : 'queue_escalated',
    targetType: 'queue_item',
    targetId: String(item.id),
    context: {
      target_type: item.target_type,
      target_id: item.target_id,
      queue_reason: item.queue_reason,
    },
  });

  return NextResponse.json({ ok: true, queueItemId, resolution });
}
