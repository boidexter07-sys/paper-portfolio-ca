'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { markNotificationsReadAction } from '@/lib/community/actions';

interface NotificationItem {
  id: number;
  kind: 'reply' | 'mention' | 'reaction';
  source_type: 'thread' | 'comment';
  source_id: string;
  actor_id: string;
  created_at: number;
  read_at: number | null;
  actor_display_name: string | null;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    try {
      const res = await fetch('/api/community/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as { unread: number; recent: NotificationItem[] };
      setUnread(json.unread);
      setItems(json.recent);
    } catch {
      // ignore network blips
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Optimistically clear, then call server.
      setUnread(0);
      await markNotificationsReadAction();
      refresh();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative pv-btn-ghost text-body-sm"
        aria-label="Notifications"
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-negative text-bone text-micro rounded-full px-1.5 min-w-[18px] text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-bone rounded-lg shadow-modal border border-fog z-40 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-fog">
            <h3 className="font-serif text-h4 text-ink">Notifications</h3>
          </div>
          {items.length === 0 ? (
            <div className="p-4 text-caption text-stone text-center">No notifications yet.</div>
          ) : (
            <ul className="divide-y divide-fog">
              {items.map((n) => {
                const href =
                  n.source_type === 'thread'
                    ? `/community/${n.source_id}`
                    : `/community/${n.source_id}#comment-${n.source_id}`;
                return (
                  <li key={n.id} className="p-3 hover:bg-fog">
                    <Link href={href} className="block">
                      <p className="text-body-sm text-ink">
                        <span className="font-medium">{n.actor_display_name ?? 'Someone'}</span>{' '}
                        {n.kind === 'reply' ? 'replied to your post' : n.kind === 'mention' ? 'mentioned you' : 'reacted to your post'}
                      </p>
                      <p className="text-caption text-stone mt-0.5">{timeAgo(n.created_at)}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
