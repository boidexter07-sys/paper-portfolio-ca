// /arena/merch — Giftbit placeholder redemption page. Renders the
// catalog, the user's recent redemptions, and the redemption form.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { MERCH_CATALOG, listUserRedemptions, formatCrToCad } from '@/lib/arena/merch';
import { getBalance } from '@/lib/arena/credits';
import { MerchRedeemClient } from './MerchRedeemClient';

export const dynamic = 'force-dynamic';

export default async function MerchPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/arena/merch');
  const balance = getBalance(user.id);
  const redemptions = listUserRedemptions(user.id, 20);
  const isMock = !process.env.GIFTBIT_API_KEY;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="pv-eyebrow">Spend credits on rewards</p>
          <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">Rewards</h1>
          <p className="text-body text-graphite mt-1 max-w-prose">
            Trade credits for gift cards, merch, or donations. 1,000 cr = $1.00 CAD.
          </p>
        </div>
        <Link href="/arena" className="pv-btn-ghost text-body-sm">Back to ARENA</Link>
      </header>

      <section className="pv-card p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <p className="pv-eyebrow">Your balance</p>
          <p className="font-serif text-h2 text-ink pv-num">{balance.balance.toLocaleString('en-CA')} cr</p>
        </div>
        {isMock && (
          <p className="text-caption text-stone max-w-md">
            Giftbit integration pending — every redemption is fulfilled locally with a mock id. The full flow (gift card codes / merch shipping) lands once the partner API key is configured.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MERCH_CATALOG.map((item) => (
          <article key={item.key} className="pv-card p-4 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="text-3xl">{item.icon}</div>
              <span className="text-caption text-stone">{item.category.replace('_', ' ')}</span>
            </div>
            <h3 className="font-serif text-h4 text-ink mt-2">{item.name}</h3>
            <p className="text-body-sm text-graphite mt-1">{item.description}</p>
            <div className="mt-auto pt-3 border-t border-fog flex items-center justify-between">
              <span className="text-caption text-stone">{item.credits.toLocaleString('en-CA')} cr</span>
              <span className="text-caption text-stone">{formatCrToCad(item.credits)}</span>
            </div>
            <MerchRedeemClient
              itemKey={item.key}
              itemName={item.name}
              credits={item.credits}
              canAfford={balance.balance >= item.credits}
            />
          </article>
        ))}
      </section>

      <section>
        <h2 className="font-serif text-h2 text-ink mb-3">Recent redemptions</h2>
        {redemptions.length === 0 ? (
          <p className="text-body text-stone">No redemptions yet.</p>
        ) : (
          <ul className="pv-card divide-y divide-fog">
            {redemptions.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{r.item_name}</p>
                  <p className="text-caption text-stone">
                    {new Date(r.created_at).toLocaleString('en-CA')} · {r.credits_spent.toLocaleString('en-CA')} cr
                    {r.giftbit_request_id ? ` · request ${r.giftbit_request_id}` : ''}
                  </p>
                  {r.note && <p className="text-caption text-stone mt-1">{r.note}</p>}
                </div>
                <span className={`pv-pill ${r.status === 'fulfilled' ? 'pv-pill-positive' : r.status === 'failed' ? 'pv-pill-negative' : 'pv-pill-neutral'}`}>
                  {r.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}