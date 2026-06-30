// GET /api/community/mod/queue?limit=N&offset=M
//
// List unresolved moderation queue items, paginated, newest first.
// Mod-only. The T39 mod UI will use this; for v1 the first mod (Muse)
// can hit it with curl to clear the backlog.
//
// Response shape:
//   { ok: true, items: [...], total: N }
//
// Each item is joined with the thread/comment target so the mod can
// see the content inline without a second round trip.

import { NextRequest, NextResponse } from 'next/server';
import { requireModerator } from '@/lib/community/mod';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const mod = await requireModerator();
  if (!mod) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') || '50'), 1), 200);
  const offset = Math.max(Number(req.nextUrl.searchParams.get('offset') || '0'), 0);

  const db = getDb();
  const total = (
    db
      .prepare('SELECT COUNT(*) as n FROM community_moderation_queue WHERE resolved_at IS NULL')
      .get() as { n: number }
  ).n;

  const items = db
    .prepare(
      `SELECT q.id, q.target_type, q.target_id, q.queue_reason, q.context_json,
              q.created_at, q.priority,
              t.title AS thread_title, t.body AS thread_body, t.author_id AS thread_author_id,
              c.body AS comment_body, c.author_id AS comment_author_id
       FROM community_moderation_queue q
       LEFT JOIN community_threads t ON q.target_type = 'thread' AND q.target_id = t.id
       LEFT JOIN community_comments c ON q.target_type = 'comment' AND q.target_id = c.id
       WHERE q.resolved_at IS NULL
       ORDER BY q.priority DESC, q.created_at ASC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<{
      id: number;
      target_type: string;
      target_id: string;
      queue_reason: string;
      context_json: string;
      created_at: number;
      priority: number;
      thread_title: string | null;
      thread_body: string | null;
      thread_author_id: string | null;
      comment_body: string | null;
      comment_author_id: string | null;
    }>;

  return NextResponse.json(
    { ok: true, total, items },
    { headers: { 'cache-control': 'no-store, max-age=0' } }
  );
}
