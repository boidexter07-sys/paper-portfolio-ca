// /arena/start/[kind] — pre-accept screen for an individual challenge.
// Lets the player pick a duration (C5) or just hit Accept.

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getCatalogEntry, CATALOG_ORDER, type ChallengeKind } from '@/lib/arena/catalog';
import { StartChallengeForm } from './StartChallengeForm';

export const dynamic = 'force-dynamic';

export default async function StartChallengePage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/arena');
  const { kind: kindStr } = await params;
  if (!CATALOG_ORDER.includes(kindStr as ChallengeKind)) notFound();
  const entry = getCatalogEntry(kindStr);
  if (!entry) notFound();
  if (entry.bucket !== 'individual') {
    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-readable">
        <p className="pv-eyebrow">Group challenges</p>
        <h1 className="font-serif text-h1 text-ink">{entry.name}</h1>
        <p className="text-body text-graphite mt-2 max-w-prose">
          {entry.description}
        </p>
        <p className="text-body text-graphite mt-3 max-w-prose">
          Group challenges need a clan. Open the ARENA dashboard and pick one from the catalog.
        </p>
        <Link href="/arena?tab=open" className="pv-btn-mark mt-3 inline-block">Open ARENA dashboard</Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-readable">
      <p className="pv-eyebrow">Accept challenge</p>
      <h1 className="font-serif text-h1 text-ink">{entry.name}</h1>
      <p className="text-body text-graphite mt-2 max-w-prose">{entry.description}</p>
      <StartChallengeForm
        kind={entry.kind}
        stakeFree={entry.stake_free}
        stakeSub={entry.stake_sub}
        multiplier={entry.multiplier}
        durationOptions={entry.duration_options}
        defaultDuration={entry.duration_days}
        maxPayoutFree={entry.max_payout_free}
        maxPayoutSub={entry.max_payout_sub}
      />
    </div>
  );
}