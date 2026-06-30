// GET /api/community/notifications — returns unread count + recent
// notifications. Used by the bell icon's polling widget.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUnreadNotificationCount, getRecentNotifications } from '@/lib/community/queries';

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'auth' }, { status: 401 });
  }
  return NextResponse.json(
    {
      ok: true,
      unread: getUnreadNotificationCount(user.id),
      recent: getRecentNotifications(user.id, 20),
    },
    { headers: { 'cache-control': 'no-store, max-age=0' } }
  );
}
