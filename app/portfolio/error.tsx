'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function PortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Portfolio page error:', error);
  }, [error]);

  return (
    <div className="t91">
      <div className="t91-header">
        <span className="t91-eyebrow" style={{ color: 'var(--t91-coral)' }}>
          Something went sideways
        </span>
        <h1 className="t91-h1" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>
          We couldn&apos;t load your dashboard.
        </h1>
        <p
          style={{
            color: 'var(--t91-muted)',
            maxWidth: 560,
            marginTop: 14,
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          This is usually a temporary hiccup. Try again, or head to Discover to keep exploring.
        </p>
        {error?.digest && (
          <p className="t91-stat-sub" style={{ marginTop: 12, fontFamily: 'var(--font-mono)' }}>
            Ref: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => reset()}
            className="t91-action"
            style={{ width: 'auto', padding: '12px 20px', cursor: 'pointer', font: 'inherit', color: 'var(--t91-paper)' }}
          >
            <span className="t91-action-cta">Try again</span>
          </button>
          <Link
            href="/discover"
            className="t91-action"
            style={{ width: 'auto', padding: '12px 20px', borderColor: 'var(--t91-hairline-strong)' }}
          >
            <span className="t91-action-cta" style={{ color: 'var(--t91-muted)' }}>
              Browse stocks
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}