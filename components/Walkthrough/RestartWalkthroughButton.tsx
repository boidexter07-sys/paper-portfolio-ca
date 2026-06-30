// T43: client-side button that resets the walkthrough completion
// timestamp by POSTing to /api/walkthrough/complete with { reset: true },
// then refreshes the page so the layout re-evaluates and the
// WalkthroughOverlayMount renders on the next navigation.
//
// The button lives on /account under the "Tour" section.
//
// We render a confirmation step inline so the user doesn't trigger a
// reset by accident. The reset is reversible — they can complete the
// tour again by re-running the wizard or hitting "Skip tour" once the
// overlay reappears.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Status = 'idle' | 'pending' | 'done' | 'error';

export function RestartWalkthroughButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onRestart = async () => {
    setStatus('pending');
    setError(null);
    try {
      const res = await fetch('/api/walkthrough/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reset: true }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setStatus('done');
      // Refresh — the layout re-evaluates; the WalkthroughOverlayMount
      // will re-mount because walkthrough_completed_at is now NULL.
      router.refresh();
      setTimeout(() => router.push('/'), 400);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not restart the tour.');
      setStatus('error');
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="pv-btn-secondary text-body-sm"
      >
        Restart the tour
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-body-sm text-graphite">
        Restart shows the 6-step tour again on your next page view. You can skip it any time.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onRestart}
          disabled={status === 'pending'}
          className="pv-btn-mark text-body-sm"
        >
          {status === 'pending' ? 'Restarting…' : 'Yes, restart'}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setStatus('idle');
            setError(null);
          }}
          className="pv-btn-ghost text-body-sm"
          disabled={status === 'pending'}
        >
          Cancel
        </button>
      </div>
      {status === 'error' && error && (
        <p className="text-caption text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
