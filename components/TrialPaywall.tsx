'use client';

import { useState } from 'react';
import { PAYWALL_COPY } from '@/lib/disclosures';

export function TrialPaywall({ userId, expired, daysIntoTrial }: { userId: string; expired: boolean; daysIntoTrial: number }) {
  // Show reminder at day 5, 6, 7 if not yet expired.
  const [dismissed, setDismissed] = useState(false);
  const showReminder = !expired && daysIntoTrial >= 5 && !dismissed;
  const showPaywall = expired && !dismissed;

  if (showPaywall) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-8 bg-ink/40" role="dialog" aria-modal="true">
        <div className="pv-card w-full max-w-md p-6 sm:p-8 shadow-modal">
          <h2 className="font-serif text-h2 text-ink mb-3">{PAYWALL_COPY.title}</h2>
          <p className="text-body text-graphite mb-3">{PAYWALL_COPY.body}</p>
          <p className="text-body-sm text-graphite mb-6">{PAYWALL_COPY.keep}</p>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="font-serif text-h2 text-ink">{PAYWALL_COPY.priceLabel}</span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="pv-btn-primary w-full"
              onClick={() => alert('Subscriptions open after the prototype review.')}
            >
              {PAYWALL_COPY.subscribe}
            </button>
            <button
              type="button"
              className="pv-btn-ghost w-full"
              onClick={() => setDismissed(true)}
            >
              {PAYWALL_COPY.remindLater}
            </button>
            <a href="#already" className="text-caption text-stone text-center mt-1 hover:underline">{PAYWALL_COPY.alreadySubscribed}</a>
          </div>
        </div>
      </div>
    );
  }

  if (showReminder) {
    const day = daysIntoTrial;
    const msg = day === 5 ? PAYWALL_COPY.day5 : day === 6 ? PAYWALL_COPY.day6 : PAYWALL_COPY.day7;
    return (
      <div className="fixed bottom-20 md:bottom-4 inset-x-4 md:right-4 md:left-auto md:w-96 z-40">
        <div className="pv-card p-4 flex items-start gap-3 shadow-modal">
          <div className="flex-1">
            <p className="text-body-sm text-ink font-medium">{msg}</p>
            <p className="text-caption text-stone mt-1">$4.99 CAD per month. No automatic charges during trial.</p>
          </div>
          <button
            type="button"
            className="text-caption text-graphite hover:text-ink"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
}
