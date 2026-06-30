'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

type Props = {
  kind: string;
  stakeFree: number;
  stakeSub: number;
  multiplier: number;
  durationOptions?: number[];
  defaultDuration: number;
  maxPayoutFree: number;
  maxPayoutSub: number;
};

export function StartChallengeForm({
  kind,
  stakeFree,
  stakeSub,
  multiplier,
  durationOptions,
  defaultDuration,
  maxPayoutFree,
  maxPayoutSub,
}: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [durationDays, setDurationDays] = useState<number>(defaultDuration);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stake = isSubscriber ? stakeSub : stakeFree;
  const maxPayout = isSubscriber ? maxPayoutSub : maxPayoutFree;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/arena/challenges/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, isSubscriber, durationDays }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Could not accept challenge.');
        setSubmitting(false);
        return;
      }
      push(`Accepted ${kind} for ${data.stakeCr} cr`, 'positive');
      router.push(`/arena/challenge/${data.challengeId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="pv-card p-4 sm:p-5 space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="checkbox"
            checked={isSubscriber}
            onChange={(e) => setIsSubscriber(e.target.checked)}
            className="h-4 w-4"
          />
          I&apos;m a subscriber (lower stake)
        </label>
      </div>

      {durationOptions && (
        <div>
          <label className="pv-eyebrow block mb-1">Duration</label>
          <div className="flex flex-wrap gap-2">
            {durationOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationDays(d)}
                className={`px-3 py-1.5 rounded-md text-body-sm border ${durationDays === d ? 'border-mark bg-fog' : 'border-fog bg-bone'}`}
              >
                {d} day{d > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 text-body-sm">
        <div>
          <dt className="pv-eyebrow">Stake</dt>
          <dd className="font-serif text-h3 text-ink pv-num">{stake.toLocaleString('en-CA')} cr</dd>
        </div>
        <div>
          <dt className="pv-eyebrow">Max payout</dt>
          <dd className="font-serif text-h3 text-ink pv-num">{maxPayout.toLocaleString('en-CA')} cr</dd>
        </div>
        <div>
          <dt className="pv-eyebrow">Multiplier</dt>
          <dd className="font-serif text-h3 text-mark pv-num">{multiplier.toFixed(2)}×</dd>
        </div>
        <div>
          <dt className="pv-eyebrow">Duration</dt>
          <dd className="font-serif text-h3 text-ink">{durationDays} day{durationDays > 1 ? 's' : ''}</dd>
        </div>
      </dl>

      {error && <p className="text-body-sm text-negative">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="pv-btn-mark">
          {submitting ? 'Accepting…' : `Accept — ${stake} cr stake`}
        </button>
        <Link href="/arena" className="pv-btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}