// /arena/clans — list of all clans + browse + join CTA.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { listClans, listUserClans } from '@/lib/arena/clans';

export const dynamic = 'force-dynamic';

export default async function ClansListPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/arena/clans');

  const clans = listClans(50, 'weekly');
  const myClans = listUserClans(user.id);
  const myClanIds = new Set(myClans.map((c) => c.id));

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4 max-w-3xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="pv-eyebrow">Browse</p>
          <h1 className="font-serif text-h1 text-ink">Clans</h1>
          <p className="text-body text-graphite mt-1 max-w-prose">
            Persistent groups of up to 50 members. Clans play group challenges together (G1–G4) and run Clan Duels (G7).
          </p>
        </div>
        <Link href="/arena/clans/new" className="pv-btn-mark whitespace-nowrap">Create a clan</Link>
      </header>

      {clans.length === 0 ? (
        <div className="pv-card p-6 text-center">
          <p className="text-body text-graphite">No clans yet. Be the first.</p>
          <Link href="/arena/clans/new" className="pv-btn-mark mt-3 inline-block">Create a clan</Link>
        </div>
      ) : (
        <section className="space-y-2">
          {clans.map((c) => (
            <Link
              key={c.id}
              href={`/arena/clan/${c.id}`}
              className="block pv-card p-4 sm:p-5 hover:shadow-card transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {myClanIds.has(c.id) && <span className="pv-pill pv-pill-positive">YOUR CLAN</span>}
                    <h2 className="font-serif text-h3 text-ink truncate">{c.name}</h2>
                  </div>
                  <p className="text-body-sm text-graphite line-clamp-2">{c.description || 'No description.'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-serif text-h4 text-ink pv-num">{c.member_count}</p>
                  <p className="text-caption text-stone">members</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-fog flex flex-wrap gap-x-6 gap-y-1 text-caption text-graphite">
                <span>Weekly: <span className="font-medium text-ink pv-num">{c.weekly_credits_won.toLocaleString('en-CA')} cr</span></span>
                <span>All-time: <span className="font-medium text-ink pv-num">{c.total_credits_won.toLocaleString('en-CA')} cr</span></span>
                <span>Matchmaking: <span className="font-medium text-ink">{c.matchmaking_opt_in ? 'on' : 'off'}</span></span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}