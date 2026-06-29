'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PAPER_ONLY_SAFETY } from '@/lib/disclosures';
import { useToast } from './ToastProvider';

type Portfolio = { id: string; name: string; style: string };

/**
 * TradeButton — Buy/Sell controls for the Stock Profile page.
 *
 * v6 — applies Option A Accent 3 (press-state neumorphic buttons):
 *   - Resting state: 2-layer outset shadow (1 dark, 1 light) → looks raised.
 *   - Pressed state: shadows invert to inset + translate-y(1px) → feels physical.
 *   - Springs back on release.
 *   - Honors prefers-reduced-motion (CSS @media query in globals.css disables
 *     the transitions but the visual treatment is still legible).
 */
export function TradeButton({
  ticker,
  price,
  portfolios,
  canSell = true,
}: {
  ticker: string;
  price: number;
  portfolios: Portfolio[];
  /** When false (e.g. user does not own this stock), the Sell button is disabled
   *  with a helper text. */
  canSell?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id || '');
  const [quantity, setQuantity] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { push } = useToast();

  const qty = parseFloat(quantity);
  const total = (isFinite(qty) ? qty : 0) * price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!portfolioId) {
      setErr('Pick a paper portfolio to trade into.');
      return;
    }
    if (!isFinite(qty) || qty <= 0) {
      setErr('Quantity must be a positive number.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId, ticker, side, quantity: qty, price }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error || PAPER_ONLY_SAFETY.tradeError);
        setSubmitting(false);
        return;
      }
      // Server-side revalidatePath in /api/trade has already invalidated the
      // affected routes. Close the modal and clear state synchronously — do
      // NOT block on router.refresh(), which would re-trigger the slow server
      // render and freeze the button in its "submitting" state.
      push(PAPER_ONLY_SAFETY.postTradeToast, 'positive');
      setOpen(false);
      setSubmitting(false);
      setQuantity('10');
      // Background navigation refresh so subsequent clicks see fresh data
      // without blocking the UI. Defer to a microtask so the close animation
      // and toast render first.
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setErr(PAPER_ONLY_SAFETY.tradeError);
      setSubmitting(false);
    }
  }

  function openBuy() {
    setSide('buy');
    setOpen(true);
  }
  function openSell() {
    if (!canSell) return;
    setSide('sell');
    setOpen(true);
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          type="button"
          className="pv-btn-neo pv-btn-neo-buy flex-1"
          onClick={openBuy}
        >
          Buy (paper)
        </button>
        <button
          type="button"
          className="pv-btn-neo pv-btn-neo-sell flex-1"
          onClick={openSell}
          disabled={!canSell}
          title={!canSell ? "You don't own this stock yet" : undefined}
          aria-disabled={!canSell}
        >
          Sell (paper)
        </button>
      </div>
      {!canSell && (
        <p className="mt-2 text-caption text-stone">You don&apos;t own this stock yet.</p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-8 bg-ink/30" role="dialog" aria-modal="true">
          <div className="pv-card w-full max-w-md p-6 shadow-modal">
            <h2 className="font-serif text-h3 text-ink mb-1">{PAPER_ONLY_SAFETY.preTradeTitle}</h2>
            <p className="text-body-sm text-graphite mb-4">{PAPER_ONLY_SAFETY.preTradeBody}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-caption text-graphite mb-1">Paper portfolio</label>
                <select
                  className="pv-input"
                  value={portfolioId}
                  onChange={(e) => setPortfolioId(e.target.value)}
                >
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption text-graphite mb-1">Side</label>
                  <select className="pv-input" value={side} onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}>
                    <option value="buy">Buy (paper)</option>
                    <option value="sell">Sell (paper)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-caption text-graphite mb-1">Quantity</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="pv-input pv-num"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-baseline justify-between p-3 bg-fog/60 rounded-md">
                <span className="text-caption text-graphite">Market price</span>
                <span className="font-medium pv-num text-ink">${price.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-body-sm text-graphite">Estimated total</span>
                <span className="font-serif text-h3 text-ink pv-num">${total.toFixed(2)}</span>
              </div>
              {err && <p className="text-caption text-negative">{err}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" className="pv-btn-ghost flex-1" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="pv-btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Saving…' : `Confirm ${side === 'buy' ? 'buy' : 'sell'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}