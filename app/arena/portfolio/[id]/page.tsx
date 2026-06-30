// /arena/portfolio/[id] — challenge portfolio view. Editable during
// the challenge, read-only after ends_at. Buy/sell actions live in
// client components to keep the server component lean.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getChallengePortfolio,
  listHoldings,
  isReadOnly,
  CHALLENGE_PORTFOLIO_STARTING_CASH,
} from '@/lib/arena/portfolios';
import { getChallenge } from '@/lib/arena/challenges';
import { getCatalogEntry } from '@/lib/arena/catalog';
import { TradePanel } from './TradePanel';

export const dynamic = 'force-dynamic';

export default async function ChallengePortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/arena');
  const { id } = await params;
  const portfolio = getChallengePortfolio(id);
  if (!portfolio) notFound();
  if (portfolio.user_id !== user.id) notFound();

  const challenge = getChallenge(portfolio.challenge_id);
  if (!challenge) notFound();
  const entry = getCatalogEntry(challenge.kind);
  if (!entry) notFound();
  const holdings = listHoldings(portfolio.id);
  const holdingsValue = holdings.reduce((a, b) => a + b.market_value, 0);
  const totalValue = portfolio.cash_balance + holdingsValue;
  const totalPnl = totalValue - portfolio.starting_cash;
  const totalPnlPct = portfolio.starting_cash > 0 ? (totalPnl / portfolio.starting_cash) * 100 : 0;
  const readOnly = isReadOnly(portfolio, challenge);

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4 max-w-4xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="pv-eyebrow">
            Challenge portfolio · ${CHALLENGE_PORTFOLIO_STARTING_CASH.toLocaleString('en-CA')} · {entry.name} · Ends {new Date(challenge.ends_at).toLocaleDateString('en-CA')}
          </p>
          <h1 className="font-serif text-h1 text-ink leading-tight">Challenge portfolio</h1>
          <p className="text-body text-graphite mt-1">
            {readOnly
              ? 'Read-only — this challenge has ended. View your final standings below.'
              : 'Edit trades during the challenge. Cash not yet deployed earns no P&L.'}
          </p>
        </div>
        <Link href={`/arena/challenge/${challenge.id}`} className="pv-btn-ghost text-body-sm">Back to challenge</Link>
      </header>

      <section className="pv-card p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total value" value={`$${totalValue.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`} />
          <Stat label="Cash" value={`$${portfolio.cash_balance.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`} />
          <Stat label="Holdings" value={String(holdings.length)} />
          <Stat label="P&L" value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString('en-CA', { maximumFractionDigits: 0 })} (${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%)`} />
        </div>
      </section>

      {!readOnly && (
        <section>
          <h2 className="font-serif text-h3 text-ink mb-3">Trade</h2>
          <TradePanel portfolioId={portfolio.id} />
        </section>
      )}

      <section>
        <h2 className="font-serif text-h3 text-ink mb-3">Holdings</h2>
        {holdings.length === 0 ? (
          <p className="text-body text-stone">No holdings yet.</p>
        ) : (
          <div className="pv-card overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-left text-caption text-stone border-b border-fog">
                  <th className="py-2 px-3">Ticker</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3 text-right">Avg cost</th>
                  <th className="py-2 px-3 text-right">Current</th>
                  <th className="py-2 px-3 text-right">Value</th>
                  <th className="py-2 px-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.ticker} className="border-b border-fog/50 last:border-0">
                    <td className="py-2 px-3 font-medium text-ink">{h.ticker}</td>
                    <td className="py-2 px-3 text-right pv-num">{h.quantity.toLocaleString('en-CA')}</td>
                    <td className="py-2 px-3 text-right pv-num">${h.avg_cost.toLocaleString('en-CA', { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right pv-num">${h.current_price.toLocaleString('en-CA', { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right pv-num">${h.market_value.toLocaleString('en-CA', { maximumFractionDigits: 0 })}</td>
                    <td className={`py-2 px-3 text-right pv-num ${h.unrealized_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {h.unrealized_pnl >= 0 ? '+' : ''}${h.unrealized_pnl.toLocaleString('en-CA', { maximumFractionDigits: 0 })} ({h.unrealized_pnl_pct >= 0 ? '+' : ''}{h.unrealized_pnl_pct.toFixed(2)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="pv-eyebrow">{label}</p>
      <p className="font-serif text-h3 text-ink pv-num">{value}</p>
    </div>
  );
}