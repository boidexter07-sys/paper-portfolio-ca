// /arena — ARENA dashboard. Renders the 4-tab experience:
//   Live now      — challenges currently scoring
//   Open to join  — challenges accepting participants
//   Your clan     — clan info, roster, leaderboard (visible if member)
//   History       — settled/cancelled challenges
//
// Auth: logged-in only. AppShell handles redirect.

import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  listLiveChallenges,
  listOpenChallenges,
  listHistoryChallenges,
  getUserChallenges,
  formatTimeRemaining,
  getCatalogEntry,
  countParticipants,
  stakeFor,
  maxPayoutFor,
  CATALOG_ORDER,
  listAllChallenges,
  listUserClans,
  getBalance,
  formatCredits,
  weeklyEarnedCr,
  lifetimeChallengePayoutsCr,
  getUserRanks,
} from '@/lib/arena';
import type { ChallengeRow } from '@/lib/arena/challenges';

export const dynamic = 'force-dynamic';

type Tab = 'live' | 'open' | 'clan' | 'history';

function isValidTab(s: string): s is Tab {
  return s === 'live' || s === 'open' || s === 'clan' || s === 'history';
}

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/arena');

  const sp = await searchParams;
  const tab: Tab = isValidTab(sp.tab ?? 'live') ? (sp.tab as Tab) : 'live';

  // Pre-fetch all four datasets in parallel — the tab UI picks one.
  const live = listLiveChallenges(50);
  const open = listOpenChallenges(50);
  const history = listHistoryChallenges(50);
  const userClans = listUserClans(user.id);
  const balance = getBalance(user.id);
  const weeklyCr = weeklyEarnedCr(user.id);
  const lifetimeCr = lifetimeChallengePayoutsCr(user.id);
  const ranks = getUserRanks(user.id);
  const myChallenges = getUserChallenges(user.id, 50);
  const allCatalog = listAllChallenges();

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl">
      <header>
        <p className="pv-eyebrow">Compete on paper, not for money</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">ARENA</h1>
        <p className="text-body text-graphite mt-2 max-w-prose">
          Stake credits on short-horizon predictions. Win prizes from the platform&apos;s prize pool. No real money is wagered.
        </p>
      </header>

      {/* Credit balance strip */}
      <section className="pv-card p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="pv-eyebrow">Balance</p>
            <p className="font-serif text-h3 text-ink pv-num">{formatCredits(balance.balance)}</p>
          </div>
          <div>
            <p className="pv-eyebrow">Earned this week</p>
            <p className="font-serif text-h3 text-ink pv-num">{formatCredits(weeklyCr)}</p>
          </div>
          <div>
            <p className="pv-eyebrow">All-time payouts</p>
            <p className="font-serif text-h3 text-ink pv-num">{formatCredits(lifetimeCr)}</p>
          </div>
          <div>
            <p className="pv-eyebrow">Your rank</p>
            <p className="font-serif text-h3 text-ink pv-num">
              {ranks.weekly ? `#${ranks.weekly}` : '—'}{' '}
              {ranks.alltime ? <span className="text-caption text-stone">(all-time #{ranks.alltime})</span> : null}
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="border-b border-fog flex gap-1 overflow-x-auto" aria-label="ARENA sections">
        <TabLink tab="live" current={tab} label="Live now" count={live.length} />
        <TabLink tab="open" current={tab} label="Open to join" count={open.length} />
        <TabLink tab="clan" current={tab} label="Your clan" count={userClans.length} clanOnly={userClans.length === 0} />
        <TabLink tab="history" current={tab} label="History" count={history.length} />
      </nav>

      <Suspense fallback={<p className="text-body text-stone">Loading…</p>}>
        {tab === 'live' && <LiveTab live={live} myChallenges={myChallenges} />}
        {tab === 'open' && <OpenTab open={open} allCatalog={allCatalog} userIsClanless={userClans.length === 0} />}
        {tab === 'clan' && <ClanTab userClans={userClans} />}
        {tab === 'history' && <HistoryTab history={history} myChallenges={myChallenges} />}
      </Suspense>
    </div>
  );
}

function TabLink({ tab, current, label, count, clanOnly }: { tab: Tab; current: Tab; label: string; count: number; clanOnly?: boolean }) {
  const active = tab === current;
  if (clanOnly) {
    return (
      <Link
        href="/arena?tab=clan"
        className="px-3 py-2 -mb-px text-body-sm whitespace-nowrap border-b-2 border-transparent text-stone hover:text-ink"
      >
        {label} <span className="text-caption text-stone">(no clan yet)</span>
      </Link>
    );
  }
  return (
    <Link
      href={`/arena?tab=${tab}`}
      className={`px-3 py-2 -mb-px text-body-sm whitespace-nowrap border-b-2 transition-colors ${
        active ? 'border-mark text-ink font-medium' : 'border-transparent text-graphite hover:text-ink'
      }`}
    >
      {label} <span className="text-caption text-stone">({count})</span>
    </Link>
  );
}

function LiveTab({ live, myChallenges }: { live: ChallengeRow[]; myChallenges: ChallengeRow[] }) {
  if (live.length === 0) {
    return (
      <div className="pv-card p-6 text-center">
        <p className="text-body text-graphite">No challenges are live right now. Check the Open to join tab to start one.</p>
      </div>
    );
  }
  const myLiveIds = new Set(myChallenges.filter((c) => c.status === 'live').map((c) => c.id));
  return (
    <section className="space-y-3">
      {live.map((c) => (
        <ChallengeCard key={c.id} challenge={c} mine={myLiveIds.has(c.id)} showTimer />
      ))}
    </section>
  );
}

function OpenTab({ open, allCatalog, userIsClanless }: { open: ChallengeRow[]; allCatalog: ReturnType<typeof listAllChallenges>; userIsClanless: boolean }) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-serif text-h3 text-ink mb-3">Open group challenges</h2>
        {open.length === 0 ? (
          <p className="text-body text-stone">No open challenges right now.</p>
        ) : (
          <div className="space-y-3">
            {open.map((c) => (
              <ChallengeCard key={c.id} challenge={c} mine={false} showTimer />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-serif text-h3 text-ink mb-3">Start a new challenge</h2>
        <p className="text-body text-graphite mb-4 max-w-prose">
          Pick a challenge from the catalog below. Each one creates its own ephemeral $50,000 paper portfolio — your main portfolio is never touched.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allCatalog.map((entry) => (
            <CatalogCard
              key={entry.kind}
              entry={entry}
              userIsClanless={userIsClanless && entry.bucket !== 'individual'}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HistoryTab({ history, myChallenges }: { history: ChallengeRow[]; myChallenges: ChallengeRow[] }) {
  const myHistoryIds = new Set(myChallenges.filter((c) => c.status === 'settled' || c.status === 'cancelled').map((c) => c.id));
  if (history.length === 0) {
    return (
      <div className="pv-card p-6 text-center">
        <p className="text-body text-graphite">No settled challenges yet. Pick one from Open to join.</p>
      </div>
    );
  }
  return (
    <section className="space-y-3">
      {history.map((c) => (
        <ChallengeCard key={c.id} challenge={c} mine={myHistoryIds.has(c.id)} showTimer={false} />
      ))}
    </section>
  );
}

async function ClanTab({ userClans }: { userClans: Awaited<ReturnType<typeof listUserClans>> }) {
  if (userClans.length === 0) {
    return <NoClanPanel />;
  }
  const clan = userClans[0];
  return (
    <section className="space-y-4">
      <div className="pv-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="pv-eyebrow">Your clan</p>
            <h2 className="font-serif text-h2 text-ink">{clan.name}</h2>
            <p className="text-body text-graphite mt-1">{clan.description || 'No description yet.'}</p>
          </div>
          <Link href={`/arena/clan/${clan.id}`} className="pv-btn-ghost text-body-sm">Open clan</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-fog">
          <Stat label="Members" value={String(clan.member_count)} />
          <Stat label="Weekly wins" value={`${clan.weekly_credits_won.toLocaleString('en-CA')} cr`} />
          <Stat label="All-time wins" value={`${clan.total_credits_won.toLocaleString('en-CA')} cr`} />
          <Stat label="Matchmaking" value={clan.matchmaking_opt_in ? 'Opted in' : 'Off'} />
        </div>
      </div>
    </section>
  );
}

async function NoClanPanel() {
  return (
    <section className="space-y-4">
      <div className="pv-card p-6 text-center">
        <p className="pv-eyebrow mb-2">Join a clan to play together</p>
        <h2 className="font-serif text-h3 text-ink mb-2">You don&apos;t have a clan yet</h2>
        <p className="text-body text-graphite mb-4 max-w-prose mx-auto">
          Clans let you play group challenges together (G1–G4 + G7 Clan Duel). Create your own or browse public clans.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/arena/clans" className="pv-btn-mark">Browse clans</Link>
          <Link href="/arena/clans/new" className="pv-btn-ghost">Create a clan</Link>
        </div>
      </div>
    </section>
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

function ChallengeCard({ challenge, mine, showTimer }: { challenge: ChallengeRow; mine: boolean; showTimer: boolean }) {
  const entry = getCatalogEntry(challenge.kind);
  if (!entry) return null;
  const remaining = formatTimeRemaining(Math.max(0, challenge.ends_at - Date.now()));
  const rosterFilled = countParticipants(challenge.id);
  const status = challenge.status;
  return (
    <Link
      href={`/arena/challenge/${challenge.id}`}
      className="block pv-card p-4 sm:p-5 hover:shadow-card transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`pv-pill ${statusPillClass(status)}`}>{status.toUpperCase()}</span>
            {mine && <span className="pv-pill pv-pill-positive">YOURS</span>}
            <span className="text-caption text-stone">{entry.kind}</span>
            <span className="text-caption text-stone">{entry.short_name}</span>
          </div>
          <h3 className="font-serif text-h4 text-ink leading-snug">{entry.name}</h3>
          <p className="text-body-sm text-graphite mt-1 line-clamp-2">{entry.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-serif text-h3 text-mark pv-num">{entry.multiplier.toFixed(2)}×</p>
          <p className="text-caption text-stone">max payout</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-fog flex flex-wrap gap-x-6 gap-y-1 text-caption text-graphite">
        <span>Stake: <span className="font-medium text-ink">{entry.stake_free} cr</span> free · <span className="font-medium text-ink">{entry.stake_sub} cr</span> sub</span>
        <span>Duration: <span className="font-medium text-ink">{challenge.duration_days}d</span></span>
        {showTimer && status === 'live' && (
          <span>Ends in: <span className="font-medium text-ink">{remaining}</span></span>
        )}
        {challenge.roster_size > 1 && (
          <span>Roster: <span className="font-medium text-ink">{rosterFilled}/{challenge.roster_size}</span></span>
        )}
        <span>{entry.settlement_label}</span>
      </div>
    </Link>
  );
}

function CatalogCard({ entry, userIsClanless }: { entry: ReturnType<typeof listAllChallenges>[number]; userIsClanless: boolean }) {
  return (
    <Link
      href={`/arena/start/${entry.kind}`}
      className="block pv-card p-4 hover:shadow-card transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-2xl">{entry.icon}</div>
        <span className="text-caption text-stone">{entry.kind}</span>
      </div>
      <h3 className="font-serif text-h4 text-ink mt-2">{entry.name}</h3>
      <p className="text-body-sm text-graphite mt-1 line-clamp-2">{entry.description}</p>
      <div className="mt-3 pt-3 border-t border-fog flex justify-between text-caption">
        <span className="text-stone">Stake</span>
        <span className="font-medium text-ink pv-num">{entry.stake_free} / {entry.stake_sub} cr</span>
      </div>
      <div className="mt-1 flex justify-between text-caption">
        <span className="text-stone">Multiplier</span>
        <span className="font-medium text-mark pv-num">{entry.multiplier.toFixed(2)}×</span>
      </div>
      <div className="mt-1 flex justify-between text-caption">
        <span className="text-stone">Duration</span>
        <span className="font-medium text-ink">{entry.duration_days}d</span>
      </div>
      {userIsClanless && entry.bucket !== 'individual' && (
        <p className="text-caption text-warn mt-2">Requires a clan</p>
      )}
    </Link>
  );
}

function statusPillClass(status: string): string {
  switch (status) {
    case 'live': return 'pv-pill-positive';
    case 'open': return 'pv-pill-neutral';
    case 'settled': return 'pv-pill-neutral';
    case 'cancelled': return 'pv-pill-negative';
    default: return 'pv-pill-neutral';
  }
}