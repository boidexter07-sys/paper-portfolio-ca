'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export function TradePanel({ portfolioId }: { portfolioId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trade(side: 'buy' | 'sell') {
    if (!ticker.trim()) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity must be positive.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/arena/portfolios/${side}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ portfolioId, ticker: ticker.trim().toUpperCase(), quantity: qty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.error || `Could not ${side}.`);
        setSubmitting(false);
        return;
      }
      push(`${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${ticker.toUpperCase()}`, 'positive');
      setTicker('');
      router.refresh();
      setSubmitting(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setSubmitting(false);
    }
  }

  return (
    <div className="pv-card p-4 sm:p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="pv-eyebrow block mb-1">Ticker</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink font-mono"
          />
        </div>
        <div>
          <label className="pv-eyebrow block mb-1">Quantity</label>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-fog bg-bone text-ink"
          />
        </div>
      </div>
      {error && <p className="text-body-sm text-negative">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => trade('buy')} disabled={submitting || !ticker.trim()} className="pv-btn-mark">
          {submitting ? 'Working…' : 'Buy'}
        </button>
        <button type="button" onClick={() => trade('sell')} disabled={submitting || !ticker.trim()} className="pv-btn-ghost">
          Sell
        </button>
      </div>
    </div>
  );
}