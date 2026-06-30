// /arena/leaderboards — weekly + all-time + per-clan + per-category.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getAllLeaderboards, type LeaderboardRow, type ClanLeaderboardRow } from '@/lib/arena/leaderboards';
import { CATALOG, CATALOG_ORDER } from '@/lib/arena/catalog';

export const dynamic = 'force-dynamic';

export default async function LeaderboardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/arena/leaderboards');
  const boards = getAllLeaderboards(100);

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="pv-eyebrow">Where everyone stands</p>
          <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">Leaderboards</h1>
          <p className="text-body text-graphite mt-1 max-w-prose">
            Weekly and all-time rankings, plus per-clan and per-category boards.
          </p>
        </div>
        <Link href="/arena" className="pv-btn-ghost text-body-sm">Back to ARENA</Link>
      </header>

      <PlayerBoardSection title="Weekly top 100 players" rows={boards.weekly} />
      <PlayerBoardSection title="All-time top 100 players" rows={boards.alltime} />
      <ClanBoardSection title="Weekly top 50 clans" rows={boards.clanWeekly} valueKey="weekly_credits_won" />
      <ClanBoardSection title="All-time top 50 clans" rows={boards.clanAllTime} valueKey="total_credits_won" />

      <section>
        <h2 className="font-serif text-h2 text-ink mb-3">Per-category top 25 players</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATALOG_ORDER.map((kind) => (
            <details key={kind} className="pv-card p-3 sm:p-4">
              <summary className="cursor-pointer flex items-center justify-between">
                <span className="font-serif text-h4 text-ink">{CATALOG[kind].name}</span>
                <span className="text-caption text-stone">{kind} · {boards.perCategory[kind].length} players</span>
              </summary>
              {boards.perCategory[kind].length === 0 ? (
                <p className="text-caption text-stone mt-2">No payouts on this kind yet.</p>
              ) : (
                <ol className="mt-3 space-y-1 text-body-sm">
                  {boards.perCategory[kind].slice(0, 10).map((r) => (
                    <li key={r.user_id} className="flex items-center justify-between">
                      <span><span className="text-caption text-stone">#{r.rank}</span> {r.display_name ?? r.email ?? 'Player'}</span>
                      <span className="pv-num">{r.metric_value.toLocaleString('en-CA')} cr</span>
                    </li>
                  ))}
                </ol>
              )}
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlayerBoardSection({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <section>
      <h2 className="font-serif text-h2 text-ink mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body text-stone">No activity yet.</p>
      ) : (
        <div className="pv-card overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="text-left text-caption text-stone border-b border-fog">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Player</th>
                <th className="py-2 px-3 text-right">Credits earned</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((r) => (
                <tr key={r.user_id} className="border-b border-fog/50 last:border-0">
                  <td className="py-2 px-3 text-caption text-stone">{r.rank}</td>
                  <td className="py-2 px-3">{r.display_name ?? r.email ?? '—'}</td>
                  <td className="py-2 px-3 text-right pv-num">{r.metric_value.toLocaleString('en-CA')} cr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ClanBoardSection({
  title,
  rows,
  valueKey,
}: {
  title: string;
  rows: ClanLeaderboardRow[];
  valueKey: 'weekly_credits_won' | 'total_credits_won';
}) {
  const label = valueKey === 'weekly_credits_won' ? 'Weekly credits' : 'All-time credits';
  return (
    <section>
      <h2 className="font-serif text-h2 text-ink mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-body text-stone">No clans yet.</p>
      ) : (
        <div className="pv-card overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="text-left text-caption text-stone border-b border-fog">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Clan</th>
                <th className="py-2 px-3 text-right">{label}</th>
                <th className="py-2 px-3 text-right">Members</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((r) => (
                <tr key={r.clan_id} className="border-b border-fog/50 last:border-0">
                  <td className="py-2 px-3 text-caption text-stone">{r.rank}</td>
                  <td className="py-2 px-3">
                    <Link href={`/arena/clan/${r.clan_id}`} className="text-mark underline">{r.clan_name}</Link>
                  </td>
                  <td className="py-2 px-3 text-right pv-num">{r[valueKey].toLocaleString('en-CA')} cr</td>
                  <td className="py-2 px-3 text-right">{r.member_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}