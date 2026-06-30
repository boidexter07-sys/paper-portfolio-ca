// /arena/challenge/[id] — challenge detail. Shows status, time
// remaining, roster (if group), challenge portfolio link (if accepted),
// and pick UI for individual challenges.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getChallenge,
  listParticipants,
  formatTimeRemaining,
  countParticipants,
} from '@/lib/arena/challenges';
import { getCatalogEntry } from '@/lib/arena/catalog';
import {
  getChallengePortfolioForUser,
  listHoldings,
  CHALLENGE_PORTFOLIO_STARTING_CASH,
} from '@/lib/arena/portfolios';

export const dynamic = 'force-dynamic';

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/arena');
  const { id } = await params;

  const challenge = getChallenge(id);
  if (!challenge) notFound();
  const entry = getCatalogEntry(challenge.kind);
  if (!entry) notFound();

  const participants = listParticipants(challenge.id);
  const mine = participants.find((p) => p.user_id === user.id) ?? null;
  const myPortfolio = mine ? getChallengePortfolioForUser(challenge.id, user.id) : null;
  const myHoldings = myPortfolio ? listHoldings(myPortfolio.id) : [];
  const remaining = Math.max(0, challenge.ends_at - Date.now());

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4 max-w-4xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`pv-pill ${statusPillClass(challenge.status)}`}>{challenge.status.toUpperCase()}</span>
            <span className="text-caption text-stone">{entry.kind}</span>
            <span className="text-caption text-stone">{entry.difficulty}</span>
          </div>
          <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">{entry.name}</h1>
          <p className="text-body text-graphite mt-2 max-w-prose">{entry.description}</p>
        </div>
        <Link href="/arena" className="pv-btn-ghost text-body-sm">Back to ARENA</Link>
      </header>

      {/* Stats card */}
      <section className="pv-card p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Stake (free / sub)" value={`${entry.stake_free} / ${entry.stake_sub} cr`} />
          <Stat label="Multiplier" value={`${entry.multiplier.toFixed(2)}×`} />
          <Stat label="Duration" value={`${challenge.duration_days} days`} />
          {challenge.status === 'live' ? (
            <Stat label="Time remaining" value={formatTimeRemaining(remaining)} />
          ) : (
            <Stat label="Settlement" value={entry.settlement_label} />
          )}
          <Stat label="Roster filled" value={`${countParticipants(challenge.id)}/${challenge.roster_size}`} />
          <Stat label="Created" value={new Date(challenge.created_at).toLocaleString('en-CA')} />
          {challenge.settled_at && <Stat label="Settled" value={new Date(challenge.settled_at).toLocaleString('en-CA')} />}
          {challenge.rake_credits > 0 && <Stat label="Rake" value={`${challenge.rake_credits.toLocaleString('en-CA')} cr`} />}
        </div>
      </section>

      {/* Clan duel timing */}
      {challenge.kind === 'G7' && (
        <section className="pv-card p-4 sm:p-5">
          <h2 className="font-serif text-h3 text-ink mb-2">Clan Duel timing</h2>
          <ul className="text-body-sm text-graphite space-y-1">
            <li>Accept deadline: {challenge.accept_deadline ? new Date(challenge.accept_deadline).toLocaleString('en-CA') : '—'}</li>
            <li>Roster lock: {challenge.roster_lock_deadline ? new Date(challenge.roster_lock_deadline).toLocaleString('en-CA') : '—'}</li>
            <li>Build lock: {challenge.build_deadline ? new Date(challenge.build_deadline).toLocaleString('en-CA') : '—'}</li>
          </ul>
        </section>
      )}

      {/* User's participation + portfolio */}
      {mine && myPortfolio && (
        <section className="pv-card p-4 sm:p-5">
          <h2 className="font-serif text-h3 text-ink mb-2">Your challenge portfolio</h2>
          <p className="text-caption text-stone mb-2">
            Challenge portfolio · ${CHALLENGE_PORTFOLIO_STARTING_CASH.toLocaleString('en-CA')} · {entry.name} · Ends {new Date(challenge.ends_at).toLocaleDateString('en-CA')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Cash" value={`$${myPortfolio.cash_balance.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`} />
            <Stat label="Starting cash" value={`$${myPortfolio.starting_cash.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`} />
            <Stat label="Holdings" value={String(myHoldings.length)} />
            <Stat label="Result" value={mine.result.toUpperCase()} />
          </div>
          {myPortfolio && (
            <Link href={`/arena/portfolio/${myPortfolio.id}`} className="mt-3 inline-block pv-btn-mark text-body-sm">
              Open challenge portfolio
            </Link>
          )}
        </section>
      )}

      {/* Accept CTA for individual challenges */}
      {!mine && entry.bucket === 'individual' && challenge.status !== 'settled' && challenge.status !== 'cancelled' && (
        <section className="pv-card p-4 sm:p-5">
          <h2 className="font-serif text-h3 text-ink mb-2">Accept this challenge</h2>
          <p className="text-body text-graphite mb-3 max-w-prose">
            Accepting will debit <span className="font-medium text-ink">{entry.stake_free} cr</span> (free) or <span className="font-medium text-ink">{entry.stake_sub} cr</span> (sub) and create a $50,000 challenge portfolio for you.
          </p>
          <Link href={`/arena/start/${entry.kind}`} className="pv-btn-mark">Start now</Link>
        </section>
      )}

      {/* Roster list for group challenges */}
      {challenge.roster_size > 1 && (
        <section>
          <h2 className="font-serif text-h3 text-ink mb-3">Roster ({participants.length}/{challenge.roster_size})</h2>
          {participants.length === 0 ? (
            <p className="text-body text-stone">No participants yet.</p>
          ) : (
            <ul className="pv-card divide-y divide-fog">
              {participants.map((p) => (
                <li key={p.user_id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">{p.user_id === user.id ? 'You' : `Member ${p.user_id.slice(-6)}`}</p>
                    <p className="text-caption text-stone">Joined {new Date(p.joined_at).toLocaleString('en-CA')}</p>
                  </div>
                  <span className="text-caption text-graphite pv-num">{p.stake_paid.toLocaleString('en-CA')} cr · {p.result}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
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

function statusPillClass(status: string): string {
  switch (status) {
    case 'live': return 'pv-pill-positive';
    case 'open': return 'pv-pill-neutral';
    case 'settled': return 'pv-pill-neutral';
    case 'cancelled': return 'pv-pill-negative';
    default: return 'pv-pill-neutral';
  }
}