'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PAPER_ONLY_SAFETY } from '@/lib/disclosures';
import { useToast } from './ToastProvider';

type Stock = {
  ticker: string;
  name: string;
  exchange: string;
  cached_price: number | null;
};

type Portfolio = { id: string; name: string; style: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Defaults for pre-selecting a ticker (e.g. when opened from /stock/[ticker]
   *  or from a "+" button on a DiscoverTable row). */
  defaultTicker?: string;
  defaultPrice?: number | null;
  stocks: Stock[];
  portfolios: Portfolio[];
};

/**
 * "Add to portfolio" modal — used by /portfolio's "+ Add holding" button and by
 * the "+" buttons on /discover stock rows. POSTs to /api/trade with side='buy'
 * and lets the server revalidate the affected routes.
 */
export function AddHoldingModal({ open, onClose, defaultTicker, defaultPrice, stocks, portfolios }: Props) {
  const [tickerQuery, setTickerQuery] = useState(defaultTicker ?? '');
  const [ticker, setTicker] = useState(defaultTicker ?? '');
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '');
  const [quantity, setQuantity] = useState('10');
  const [price, setPrice] = useState(defaultPrice ? defaultPrice.toFixed(2) : '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const { push } = useToast();
  const tickerInputRef = useRef<HTMLInputElement>(null);

  // Keep the typed query separate from the committed ticker selection so
  // typeahead can show candidates while the user is still typing.
  useEffect(() => {
    if (!open) return;
    setTickerQuery(defaultTicker ?? '');
    setTicker(defaultTicker ?? '');
    setPortfolioId(portfolios[0]?.id ?? '');
    setQuantity('10');
    const resolvedPrice = defaultPrice ? defaultPrice.toFixed(2) : (
      defaultTicker ? (stocks.find((s) => s.ticker === defaultTicker.toUpperCase())?.cached_price ?? '')?.toString() ?? '' : ''
    );
    setPrice(resolvedPrice);
    setErr(null);
    setSubmitting(false);
    // Focus the ticker field shortly after open.
    const t = setTimeout(() => tickerInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, defaultTicker, defaultPrice, portfolios, stocks]);

  const candidates = useMemo(() => {
    const q = tickerQuery.trim().toUpperCase();
    if (!q) return stocks.slice(0, 8);
    return stocks
      .filter((s) => s.ticker.startsWith(q) || s.ticker.includes(q) || s.name.toUpperCase().includes(q))
      .slice(0, 8);
  }, [tickerQuery, stocks]);

  const selectedStock = useMemo(() => stocks.find((s) => s.ticker === ticker.toUpperCase()), [stocks, ticker]);

  function pickTicker(t: string) {
    setTicker(t);
    const s = stocks.find((x) => x.ticker === t);
    if (s?.cached_price) setPrice(s.cached_price.toFixed(2));
    setTickerQuery(t);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!ticker) { setErr('Pick a ticker.'); return; }
    if (!portfolioId) { setErr('Pick a paper portfolio.'); return; }
    const qty = parseFloat(quantity);
    const pr = parseFloat(price);
    if (!isFinite(qty) || qty <= 0) { setErr('Quantity must be a positive number.'); return; }
    if (!isFinite(pr) || pr <= 0) { setErr('Price must be a positive number.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId, ticker: ticker.toUpperCase(), side: 'buy', quantity: qty, price: pr }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error || PAPER_ONLY_SAFETY.tradeError);
        setSubmitting(false);
        return;
      }
      push(PAPER_ONLY_SAFETY.postTradeToast, 'positive');
      onClose();
      router.refresh();
    } catch {
      setErr(PAPER_ONLY_SAFETY.tradeError);
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const qtyNum = parseFloat(quantity);
  const priceNum = parseFloat(price);
  const total = (isFinite(qtyNum) ? qtyNum : 0) * (isFinite(priceNum) ? priceNum : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-8 bg-ink/30" role="dialog" aria-modal="true">
      <div className="pv-card w-full max-w-md p-6 shadow-modal">
        <h2 className="font-serif text-h3 text-ink mb-1">Add to portfolio</h2>
        <p className="text-body-sm text-graphite mb-4">Paper trade only. No real money moves.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-caption text-graphite mb-1">Paper portfolio</label>
            <select className="pv-input" value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-caption text-graphite mb-1">Ticker</label>
            <input
              ref={tickerInputRef}
              type="text"
              className="pv-input uppercase"
              placeholder="e.g. AAPL"
              value={tickerQuery}
              onChange={(e) => { setTickerQuery(e.target.value.toUpperCase()); setTicker(e.target.value.toUpperCase()); }}
              autoComplete="off"
              spellCheck={false}
            />
            {tickerQuery && candidates.length > 0 && ticker !== tickerQuery && (
              <div className="mt-1 max-h-40 overflow-y-auto pv-card divide-y divide-fog">
                {candidates.map((s) => (
                  <button
                    type="button"
                    key={s.ticker}
                    className="w-full text-left px-3 py-2 hover:bg-fog/50 flex items-center justify-between"
                    onClick={() => pickTicker(s.ticker)}
                  >
                    <span>
                      <span className="font-medium text-ink">{s.ticker}</span>
                      <span className="text-caption text-stone ml-2">{s.name}</span>
                    </span>
                    <span className="text-caption text-stone pv-num">{s.exchange}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedStock && (
              <p className="text-caption text-stone mt-1">{selectedStock.name} · {selectedStock.exchange}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-caption text-graphite mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="pv-input pv-num"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-baseline justify-between p-3 bg-fog/60 rounded-md">
            <span className="text-caption text-graphite">Estimated total</span>
            <span className="font-serif text-h3 text-ink pv-num">${total.toFixed(2)}</span>
          </div>
          {err && <p className="text-caption text-negative">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" className="pv-btn-ghost flex-1" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="pv-btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add to portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
