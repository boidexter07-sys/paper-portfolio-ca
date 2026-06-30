'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { PAPER_ONLY_SAFETY } from '@/lib/disclosures';
import { AddHoldingModal } from './AddHoldingModal';
import { RemoveHoldingButton } from './RemoveHoldingButton';

type Holding = {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  name?: string;
  currency?: string;
};

type PortfolioSummary = {
  id: string;
  name: string;
  style: string;
  holdings: Holding[];
  cash_balance: number;
  /** T41: starting cash captured at portfolio creation. */
  starting_cash: number;
  total_value: number;
};

type Stock = {
  ticker: string;
  name: string;
  exchange: string;
  cached_price: number | null;
};

function money(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}
function pct(n: number) {
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

export function PortfolioHoldingsClient({
  summaries,
  stocks,
}: {
  summaries: PortfolioSummary[];
  stocks: Stock[];
}) {
  const [addOpenFor, setAddOpenFor] = useState<string | null>(null);
  const { push } = useToast();
  const router = useRouter();

  if (summaries.length === 0) {
    return (
      <div className="pv-card p-6 text-center">
        <p className="text-body text-graphite mb-3">{PAPER_ONLY_SAFETY.emptyPortfolio}</p>
        <Link href="/discover" className="pv-btn-mark">Browse stocks</Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pv-stagger-fast">
        {summaries.map((s) => (
          <section key={s.id} className="pv-card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                <h2 className="font-serif text-h2 text-ink">{s.name}</h2>
                {/* T41: "Started at $X" badge — neutral pill that captures
                    the portfolio's origin cash so the user can see at a
                    glance whether it's a $50K experiment or a $1M beast,
                    even after they've traded it down. */}
                <span className="pv-pill pv-pill-neutral" title={`Started with ${money(s.starting_cash)} of paper money`}>
                  Started at {money(s.starting_cash)}
                </span>
              </div>
              <span
                className={`pv-pill ${
                  s.holdings.reduce((a, h) => a + h.unrealized_pnl, 0) >= 0
                    ? 'pv-pill-positive'
                    : 'pv-pill-negative'
                }`}
              >
                {pct(
                  s.holdings.reduce((a, h) => a + h.cost_basis, 0) > 0
                    ? (s.holdings.reduce((a, h) => a + h.unrealized_pnl, 0) /
                        s.holdings.reduce((a, h) => a + h.cost_basis, 0)) *
                        100
                    : 0
                )}
              </span>
            </div>
            {/* T40: cash leg visible — buys shrink this, sells grow it. */}
            <div className="mb-3 grid grid-cols-2 gap-3 p-3 rounded-md bg-fog/40">
              <div>
                <p className="text-caption text-stone">Cash</p>
                <p className="font-serif text-h3 text-ink pv-num">{money(s.cash_balance)}</p>
              </div>
              <div>
                <p className="text-caption text-stone">Invested</p>
                <p className="font-serif text-h3 text-ink pv-num">{money(s.total_value - s.cash_balance)}</p>
              </div>
            </div>
            {s.holdings.length === 0 ? (
              <p className="text-body-sm text-graphite">No holdings yet — add one below.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-body-sm pv-table">
                  <thead>
                    <tr className="text-left text-caption text-stone uppercase tracking-wide border-b border-fog">
                      <th className="px-4 py-2">Ticker</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right hidden sm:table-cell">Avg cost</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">P&amp;L</th>
                      <th className="px-4 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.holdings.map((h) => (
                      <tr key={h.ticker} className="border-b border-fog last:border-0">
                        <td className="px-4 py-2.5">
                          <Link href={`/stock/${h.ticker}`} className="font-medium text-ink">{h.ticker}</Link>
                          <p className="text-caption text-stone sm:hidden">{h.name}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right pv-num">{h.quantity.toFixed(h.quantity < 10 ? 2 : 0)}</td>
                        <td className="px-4 py-2.5 text-right pv-num hidden sm:table-cell">${h.avg_cost.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right pv-num">${h.current_price.toFixed(2)}</td>
                        <td className={`px-4 py-2.5 text-right pv-num ${h.unrealized_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {money(h.unrealized_pnl)}
                          <p className="text-caption">{pct(h.unrealized_pnl_pct)}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <RemoveHoldingButton
                            portfolioId={s.id}
                            portfolioName={s.name}
                            ticker={h.ticker}
                            holdingName={h.name}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-fog">
              <button
                type="button"
                className="pv-btn-secondary text-body-sm"
                onClick={() => setAddOpenFor(s.id)}
              >
                + Add holding
              </button>
            </div>
          </section>
        ))}
      </div>

      <AddHoldingModal
        open={addOpenFor !== null}
        onClose={() => setAddOpenFor(null)}
        stocks={stocks}
        portfolios={summaries.map((s) => ({ id: s.id, name: s.name, style: s.style, cash_balance: s.cash_balance }))}
      />
    </>
  );
}
