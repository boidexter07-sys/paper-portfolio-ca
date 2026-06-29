'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function StockError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Stock profile error:', error);
  }, [error]);

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
      <div className="pv-card p-6 sm:p-8">
        <p className="pv-eyebrow text-negative">Stock page didn&apos;t load</p>
        <h1 className="font-serif text-h2 text-ink mt-1">We couldn&apos;t finish loading this stock.</h1>
        <p className="text-body text-graphite mt-2 max-w-prose">
          This usually clears up in a moment. Try again, or go back to Discover and pick another one.
        </p>
        {error?.digest && (
          <p className="text-caption text-stone mt-3">Reference: {error.digest}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" className="pv-btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/discover" className="pv-btn-ghost">Back to Discover</Link>
        </div>
      </div>
    </div>
  );
}
