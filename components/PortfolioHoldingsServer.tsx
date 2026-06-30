// Server-only render of the per-portfolio holdings tables.
// Wrapped in <Suspense> on the portfolio page so a slow getDb() call does
// not block the page header from streaming.

import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listPortfolios, getPortfolioWithHoldings } from '@/lib/portfolio';

function money(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}
function pct(n: number) {
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

export async function PortfolioHoldingsServer() {
  const user = await getCurrentUser();
  if (!user) return null;
  const portfolios = listPortfolios(user.id);
  const summaries = portfolios.map((p) => getPortfolioWithHoldings(p.id, user.id)).filter((x): x is NonNullable<typeof x> => x != null);

  if (summaries.length === 0) {
    return (
      <div className="pv-card p-6 text-center">
        <p className="text-body text-graphite mb-3">You haven&apos;t made any paper trades yet. Start with one stock you understand.</p>
        <Link href="/discover" className="pv-btn-mark">Browse stocks</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summaries.map((s) => (
        <section key={s.id} className="pv-card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-baseline gap-2 min-w-0">
              <h2 className="font-serif text-h2 text-ink">{s.name}</h2>
              {/* T41: "Started at $X" badge. */}
              <span className="pv-pill pv-pill-neutral" title={`Started with ${money(s.starting_cash)} of paper money`}>
                Started at {money(s.starting_cash)}
              </span>
            </div>
            <span className={`pv-pill ${s.total_pnl >= 0 ? 'pv-pill-positive' : 'pv-pill-negative'}`}>{pct(s.total_pnl_pct)}</span>
          </div>
          {/* T40: cash leg visible on /portfolio — every new portfolio
              starts at $100,000 and shrinks as buys go through. */}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}