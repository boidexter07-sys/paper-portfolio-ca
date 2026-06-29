import { getCurrentUser } from '@/lib/auth';
import { getUserDaysIntoTrial, getTrialDaysRemaining } from '@/lib/trial';
import { PIPEDA_NOTICE, TRIAL_DISCLOSURE, SUBSCRIPTION_PRICE_CAD } from '@/lib/constants';
import { StylePicker } from '@/components/StylePicker';
import { getDb } from '@/lib/db';
import Link from 'next/link';

const TRIAL_DAYS = 7;

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const daysInto = getUserDaysIntoTrial(user.created_at);
  const daysLeft = getTrialDaysRemaining(user.created_at);
  const watchCount = (getDb().prepare('SELECT COUNT(*) as c FROM watchlist WHERE user_id = ?').get(user.id) as { c: number }).c;
  const tradeCount = (getDb().prepare('SELECT COUNT(*) as c FROM trades WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = ?)').get(user.id) as { c: number }).c;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-3xl">
      <header>
        <p className="pv-eyebrow">Settings</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight">Your account</h1>
      </header>

      <section className="pv-card p-4 sm:p-5">
        <p className="pv-eyebrow">Signed in as</p>
        <p className="font-serif text-h2 text-ink">{user.email}</p>
        <p className="text-caption text-stone mt-1">Member since {new Date(user.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div className="flex gap-2 mt-4">
          <Link href="/logout" className="pv-btn-secondary">Log out</Link>
        </div>
      </section>

      <section className="pv-card p-4 sm:p-5">
        <p className="pv-eyebrow">Your free trial</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="font-serif text-h1 text-ink pv-num">
            {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Trial ended'}
          </p>
          <p className="text-caption text-stone">of {TRIAL_DAYS}</p>
        </div>
        <div className="w-full bg-fog h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-mark"
            style={{ width: `${Math.min(100, (daysInto / TRIAL_DAYS) * 100)}%` }}
          />
        </div>
        <p className="text-body-sm text-graphite mt-3 max-w-prose">{TRIAL_DISCLOSURE.long}</p>
        {daysLeft === 0 && (
          <div className="mt-4 p-3 rounded-md bg-warn/10 text-warn text-body-sm">
            Your trial has ended. Subscribe for <span className="pv-num">${SUBSCRIPTION_PRICE_CAD.toFixed(2)} CAD</span>/mo to keep your paper portfolio.
          </div>
        )}
      </section>

      <section className="pv-card p-4 sm:p-5">
        <p className="pv-eyebrow">Your investing style</p>
        <p className="text-body-sm text-graphite mb-3">Pick the one that sounds most like you. We use this to choose which signals to highlight.</p>
        <StylePicker current={user.investing_style} />
      </section>

      <section className="pv-card p-4 sm:p-5">
        <p className="pv-eyebrow">Activity</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="p-3 rounded-md bg-fog/50">
            <p className="text-caption text-stone">Paper trades</p>
            <p className="font-serif text-h2 text-ink pv-num">{tradeCount}</p>
          </div>
          <div className="p-3 rounded-md bg-fog/50">
            <p className="text-caption text-stone">Watchlist</p>
            <p className="font-serif text-h2 text-ink pv-num">{watchCount}</p>
          </div>
        </div>
      </section>

      <section className="pv-card p-4 sm:p-5">
        <p className="pv-eyebrow">Privacy</p>
        <p className="text-body-sm text-graphite mt-1 max-w-prose">{PIPEDA_NOTICE.long}</p>
      </section>
    </div>
  );
}
