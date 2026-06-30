// /arena/clan/[id] — clan dashboard. Shows roster, analytics,
// leaderboard rank, and (for leaders) the trigger for sending a
// Clan Duel invite.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getClan,
  listMembers,
  getClanAnalytics,
  getMembership,
} from '@/lib/arena/clans';
import {
  listPendingInvitesForUser,
  listInvitesForClan,
  CLAN_DUEL_TIMING,
} from '@/lib/arena/duels';

export const dynamic = 'force-dynamic';

export default async function ClanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duel?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/arena');
  const { id } = await params;
  const sp = await searchParams;

  const clan = getClan(id);
  if (!clan) notFound();
  const analytics = getClanAnalytics(clan.id);
  const members = listMembers(clan.id);
  const membership = getMembership(clan.id, user.id);
  const isLeader = membership?.role === 'leader';
  const isMember = !!membership;
  const invites = listInvitesForClan(clan.id);
  const myPendingInvites = isLeader ? listPendingInvitesForUser(user.id) : [];

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4 max-w-4xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="pv-eyebrow">Clan</p>
          <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">{clan.name}</h1>
          <p className="text-body text-graphite mt-1 max-w-prose">{clan.description || 'No description.'}</p>
        </div>
        <Link href="/arena?tab=clan" className="pv-btn-ghost text-body-sm">Back to ARENA</Link>
      </header>

      {/* Analytics */}
      <section className="pv-card p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Members" value={String(analytics.member_count)} />
          <Stat label="Weekly credits" value={analytics.weekly_credits_won.toLocaleString('en-CA')} />
          <Stat label="All-time credits" value={analytics.total_credits_won.toLocaleString('en-CA')} />
          <Stat label="Weekly rank" value={analytics.rank_weekly > 0 ? `#${analytics.rank_weekly}` : '—'} />
          <Stat label="Challenges active" value={String(analytics.challenges_active)} />
          <Stat label="Challenges settled" value={String(analytics.challenges_settled)} />
          <Stat label="Matchmaking" value={clan.matchmaking_opt_in ? 'On' : 'Off'} />
          <Stat label="Circle-vs-circle" value={clan.circle_vs_circle_enabled ? 'On' : 'Off'} />
        </div>
      </section>

      {/* Matchmaking toggle (leader only) */}
      {isLeader && <MatchmakingPanel clanId={clan.id} initialOptIn={!!clan.matchmaking_opt_in} initialCvc={!!clan.circle_vs_circle_enabled} />}

      {/* Roster */}
      <section>
        <h2 className="font-serif text-h3 text-ink mb-3">Roster ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-body text-stone">No members.</p>
        ) : (
          <ul className="pv-card divide-y divide-fog">
            {members.map((m) => (
              <li key={m.user_id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{m.user_id === user.id ? 'You' : `Member ${m.user_id.slice(-6)}`}</p>
                  <p className="text-caption text-stone">Joined {new Date(m.joined_at).toLocaleDateString('en-CA')}</p>
                </div>
                {m.role === 'leader' && <span className="pv-pill pv-pill-positive">LEADER</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Join / Leave button for non-members */}
      {!isMember && <JoinClanPanel clanId={clan.id} />}
      {isMember && !isLeader && <LeaveClanPanel clanId={clan.id} />}

      {/* Pending invites */}
      {myPendingInvites.length > 0 && (
        <section>
          <h2 className="font-serif text-h3 text-ink mb-3">Pending Clan Duel invites</h2>
          <div className="space-y-2">
            {myPendingInvites.map((inv) => (
              <div key={inv.id} className="pv-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-body text-ink">Clan duel invite · expires in {formatMsRemaining(Math.max(0, inv.expires_at - Date.now()))}</p>
                  <p className="text-caption text-stone">From clan {inv.clan_a_id.slice(-6)} · stake per member on accept</p>
                </div>
                <div className="flex gap-2">
                  <form action={`/api/arena/duels/${inv.id}/accept`} method="post">
                    <button type="submit" className="pv-btn-mark text-body-sm">Accept</button>
                  </form>
                  <form action={`/api/arena/duels/${inv.id}/decline`} method="post">
                    <button type="submit" className="pv-btn-ghost text-body-sm">Decline</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Duel trigger (leader only) */}
      {isLeader && (
        <section>
          <h2 className="font-serif text-h3 text-ink mb-3">Start a Clan Duel (G7)</h2>
          <p className="text-body text-graphite mb-3 max-w-prose">
            Compressed timing: 2h accept window, 4h build window, 2h roster lock. Total pre-live: 8h.
            Stake per member 10–100 cr, roster 10–20, duration 1d / 3d / 7d.
          </p>
          <DuelTriggerPanel clanId={clan.id} />
        </section>
      )}

      {/* Invitation history (sent + received) */}
      <section>
        <h2 className="font-serif text-h3 text-ink mb-3">Duel history</h2>
        {invites.length === 0 ? (
          <p className="text-body text-stone">No invites sent or received yet.</p>
        ) : (
          <ul className="pv-card divide-y divide-fog">
            {invites.slice(0, 10).map((inv) => (
              <li key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-body text-ink">
                    {inv.clan_a_id === clan.id ? 'Sent' : 'Received'} vs <span className="font-mono">{inv.clan_a_id === clan.id ? inv.clan_b_id.slice(-6) : inv.clan_a_id.slice(-6)}</span>
                  </p>
                  <p className="text-caption text-stone">{new Date(inv.created_at).toLocaleString('en-CA')}</p>
                </div>
                <span className={`pv-pill ${inv.status === 'accepted' ? 'pv-pill-positive' : inv.status === 'declined' || inv.status === 'expired' ? 'pv-pill-negative' : 'pv-pill-neutral'}`}>
                  {inv.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer disclosure */}
      <footer className="text-caption text-stone pt-4">
        <p>Paper trading only. Nothing here is investment advice. CLAN_DUEL_TIMING.ACCEPT_WINDOW_MS = {CLAN_DUEL_TIMING.ACCEPT_WINDOW_MS} ms.</p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="pv-eyebrow">{label}</p>
      <p className="font-serif text-h3 text-ink pv-num">{value}</p>
    </div>
  );
}

function formatMsRemaining(ms: number): string {
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function MatchmakingPanel({ clanId, initialOptIn, initialCvc }: { clanId: string; initialOptIn: boolean; initialCvc: boolean }) {
  return (
    <section>
      <form action={`/api/arena/clans/${clanId}/matchmaking`} method="post" className="pv-card p-4 flex flex-wrap items-center gap-3">
        <p className="pv-eyebrow flex-1">Matchmaking opt-in</p>
        <label className="flex items-center gap-2 text-body-sm">
          <input type="checkbox" name="enabled" value="1" defaultChecked={initialOptIn} className="h-4 w-4" />
          Opt in
        </label>
        <label className="flex items-center gap-2 text-body-sm">
          <input type="checkbox" name="circleVsCircle" value="1" defaultChecked={initialCvc} className="h-4 w-4" />
          Circle-vs-circle
        </label>
        <button type="submit" className="pv-btn-ghost text-body-sm">Save</button>
      </form>
    </section>
  );
}

function JoinClanPanel({ clanId }: { clanId: string }) {
  return (
    <section>
      <form action={`/api/arena/clans/${clanId}/join`} method="post" className="pv-card p-4 flex items-center justify-between">
        <p className="text-body text-graphite">You aren&apos;t a member of this clan.</p>
        <button type="submit" className="pv-btn-mark">Join clan</button>
      </form>
    </section>
  );
}

function LeaveClanPanel({ clanId }: { clanId: string }) {
  return (
    <section>
      <form action={`/api/arena/clans/${clanId}/leave`} method="post" className="pv-card p-4 flex items-center justify-between">
        <p className="text-body text-graphite">You&apos;re a member of this clan.</p>
        <button type="submit" className="pv-btn-ghost text-body-sm">Leave clan</button>
      </form>
    </section>
  );
}

function DuelTriggerPanel({ clanId }: { clanId: string }) {
  // The leader picks an opponent from the available clans list and
  // sets duration/roster/stake/theme/metric via a single form.
  // For v1 we render a server-rendered form that POSTs to a JSON API
  // route — handled by a tiny inline script tag.
  return (
    <div className="pv-card p-4">
      <p className="text-body text-graphite mb-3">
        Pick an opposing clan (you can browse <Link href="/arena/clans" className="text-mark underline">all clans</Link>), then send the invite.
      </p>
      <DuelInviteFormClient clanId={clanId} />
    </div>
  );
}

import DuelInviteFormClient from './DuelInviteFormClient';