import Link from 'next/link';
import { getDb } from '@/lib/db';

export default function CommunityPage() {
  const events = getDb()
    .prepare('SELECT ticker, event_type, actor_label, detail, created_at FROM community_events ORDER BY created_at DESC LIMIT 50')
    .all() as { ticker: string; event_type: string; actor_label: string; detail: string; created_at: number }[];

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4 max-w-3xl">
      <header>
        <p className="pv-eyebrow">What others are doing</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">Community</h1>
        <p className="text-body text-graphite mt-1 max-w-prose">
          A live, anonymized feed of paper trades and watchlist activity from other Paper Portfolio Canada learners. Not advice — just signals that other people are paying attention.
        </p>
      </header>

      <div className="pv-card divide-y divide-fog">
        {events.map((e, i) => (
          <div key={i} className="p-4 flex items-start gap-3">
            <EventIcon type={e.event_type} />
            <div className="flex-1 min-w-0">
              <p className="text-body-sm text-ink">
                {e.detail}{' '}
                <Link href={`/stock/${e.ticker}`} className="text-mark underline underline-offset-2">{e.ticker}</Link>
              </p>
              <p className="text-caption text-stone">{timeAgo(e.created_at)} · {e.actor_label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  const map: Record<string, string> = {
    paper_buy: '+',
    paper_sell: '−',
    watchlist_add: '★',
    prism_followed: '◆',
  };
  const c = type === 'paper_buy' ? 'text-positive' : type === 'paper_sell' ? 'text-negative' : 'text-graphite';
  return (
    <div className={`h-8 w-8 rounded-full bg-fog flex items-center justify-center text-body font-medium shrink-0 ${c}`}>
      {map[type] || '·'}
    </div>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
