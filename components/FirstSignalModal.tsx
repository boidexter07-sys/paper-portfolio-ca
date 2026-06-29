'use client';

import { useEffect, useState } from 'react';
import { PRISM_DISCLOSURE_MODAL_TITLE, PRISM_DISCLOSURE_MODAL_BODY } from '@/lib/disclosures';
import { ackFirstSignalAction } from '@/app/actions';

export function FirstSignalModal({ userId, initialAck }: { userId: string; initialAck: boolean }) {
  const [open, setOpen] = useState(!initialAck);

  useEffect(() => {
    setOpen(!initialAck);
  }, [initialAck]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-8 bg-ink/30" role="dialog" aria-modal="true">
      <div className="pv-card w-full max-w-md p-6 sm:p-8 shadow-modal">
        <h2 className="font-serif text-h2 text-ink mb-3">{PRISM_DISCLOSURE_MODAL_TITLE}</h2>
        <p className="text-body text-graphite mb-4">{PRISM_DISCLOSURE_MODAL_BODY.long}</p>
        <p className="text-caption text-stone mb-6">{PRISM_DISCLOSURE_MODAL_BODY.short}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="pv-btn-primary w-full sm:w-auto"
            onClick={async () => {
              await ackFirstSignalAction();
              setOpen(false);
            }}
          >
            Got it, show me the signals
          </button>
        </div>
      </div>
    </div>
  );
}
