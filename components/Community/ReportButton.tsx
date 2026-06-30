'use client';

import { useState, useTransition } from 'react';
import { reportAction } from '@/lib/community/actions';
import { REPORT_REASONS, type ReportReason } from '@/lib/community/types';

interface Props {
  targetType: 'thread' | 'comment';
  targetId: string;
  className?: string;
}

export function ReportButton({ targetType, targetId, className }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await reportAction({ targetType, targetId, reason, note });
      if (r.ok) {
        setDone(true);
        setTimeout(() => {
          setOpen(false);
          setDone(false);
          setNote('');
        }, 1200);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'pv-btn-ghost text-caption'}
        title="Report this post"
      >
        ⚐ Report
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-bone rounded-lg shadow-modal max-w-md w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-h4 text-ink">Report this {targetType}</h3>
            {done ? (
              <p className="text-body-sm text-positive">Thanks — a moderator will look at it.</p>
            ) : (
              <>
                <div>
                  <label className="block text-caption text-stone mb-1">Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="pv-input w-full"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-caption text-stone mt-1">
                    {REPORT_REASONS.find((r) => r.value === reason)?.description}
                  </p>
                </div>
                <div>
                  <label className="block text-caption text-stone mb-1">Note (optional, max 280 chars)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={280}
                    rows={3}
                    className="pv-input w-full"
                    placeholder="Anything that helps a moderator decide."
                  />
                  <p className="text-caption text-stone mt-1 text-right">{note.length}/280</p>
                </div>
                {error && <p className="text-caption text-negative">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="pv-btn-ghost text-body-sm"
                    disabled={pending}
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={submit} className="pv-btn-mark text-body-sm" disabled={pending}>
                    {pending ? 'Submitting…' : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
