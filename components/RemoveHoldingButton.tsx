'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';

export function RemoveHoldingButton({
  portfolioId,
  portfolioName,
  ticker,
  holdingName,
}: {
  portfolioId: string;
  portfolioName: string;
  ticker: string;
  holdingName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const { push } = useToast();

  async function confirm() {
    setErr(null);
    setSubmitting(true);
    try {
      const params = new URLSearchParams({ portfolioId, ticker });
      const res = await fetch(`/api/portfolio/holding?${params.toString()}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error || 'Could not remove holding.');
        setSubmitting(false);
        return;
      }
      push(`Removed ${ticker} from ${portfolioName}.`, 'positive');
      setOpen(false);
      setSubmitting(false);
      router.refresh();
    } catch {
      setErr('Could not remove holding.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="pv-btn-danger-sm"
        onClick={() => setOpen(true)}
        aria-label={`Remove ${ticker} from ${portfolioName}`}
      >
        Remove
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-8 bg-ink/30" role="dialog" aria-modal="true">
          <div className="pv-card w-full max-w-md p-6 shadow-modal">
            <h2 className="font-serif text-h3 text-ink mb-1">Remove {ticker}?</h2>
            <p className="text-body-sm text-graphite mb-4">
              Remove {ticker}{holdingName ? ` (${holdingName})` : ''} from <span className="font-medium text-ink">{portfolioName}</span>?
              This deletes the holding (paper). Your trade history is kept for your records.
            </p>
            {err && <p className="text-caption text-negative mb-3">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" className="pv-btn-ghost flex-1" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button type="button" className="pv-btn-danger flex-1" onClick={confirm} disabled={submitting}>
                {submitting ? 'Removing…' : 'Remove holding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
