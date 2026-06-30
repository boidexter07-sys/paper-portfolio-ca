// GET /api/community/threads/[id]/updates?since=<ms>
//
// Polling endpoint for live updates on a thread. Returns the thread's
// last_activity_at and the number of new comments since the given
// timestamp. The client compares against its cached value; if the
// server's last_activity_at is newer, the client triggers a full
// re-render via router.refresh().
//
// Auth: same as the page — must be logged in. The 401 short-circuits
// the poll and the client can redirect to /login.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'auth' }, { status: 401 });
  }
  const { id } = await params;
  const since = Number(req.nextUrl.searchParams.get('since') || '0');
  const db = getDb();
  const row = db
    .prepare(
      'SELECT last_activity_at FROM community_threads WHERE id = ? AND published_at IS NOT NULL AND deleted_at IS NULL AND hidden_at IS NULL'
    )
    .get(id) as { last_activity_at: number } | undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  const newCount = (
    db
      .prepare(
        'SELECT COUNT(*) as n FROM community_comments WHERE thread_id = ? AND published_at IS NOT NULL AND deleted_at IS NULL AND hidden_at IS NULL AND created_at > ?'
      )
      .get(id, since) as { n: number }
  ).n;
  return NextResponse.json(
    {
      ok: true,
      last_activity_at: row.last_activity_at,
      new_comment_count: newCount,
    },
    {
      headers: {
        // Aggressive cache-control — this is a real-time endpoint, do
        // not let any proxy cache it.
        'cache-control': 'no-store, max-age=0',
      },
    }
  );
}
