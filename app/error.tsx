'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the console for the developer; the user-facing UI is below.
    // eslint-disable-next-line no-console
    console.error('Paper Portfolio route error:', error);
  }, [error]);

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
      <div className="pv-card p-6 sm:p-8">
        <p className="pv-eyebrow text-negative">Something went wrong</p>
        <h1 className="font-serif text-h2 text-ink mt-1">This page didn&apos;t finish loading.</h1>
        <p className="text-body text-graphite mt-2 max-w-prose">
          We hit a snag rendering this page — usually a temporary data hiccup. You can try again,
          or come back to the dashboard and try a different route.
        </p>
        {error?.digest && (
          <p className="text-caption text-stone mt-3">Reference: {error.digest}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" className="pv-btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <a href="/" className="pv-btn-ghost">Back to home</a>
        </div>
      </div>
    </div>
  );
}
