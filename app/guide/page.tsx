// T43: Guide landing page.
//
// Three blocks:
//   1. Hero (eyebrow + h1 + lede + CTA to the wizard).
//   2. "Get started in 5 minutes" — a horizontal 5-step visual flow.
//   3. Grid of all 7 individual guides.
// Plus an optional "Restart walkthrough" pill if the user has already
// finished the in-app walkthrough.
//
// Auth: anyone signed in. The AppShell takes care of redirecting
// unauth users to /login.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { GUIDES, QUICK_START_STEPS } from '@/lib/guide';
import { GuideCard } from '@/components/Guide/GuideCard';

export const dynamic = 'force-dynamic';

export default async function GuideIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/guide');

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-10 max-w-5xl">
      {/* Hero */}
      <header>
        <p className="pv-eyebrow">User guide</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight mt-1">
          How the app works
        </h1>
        <p className="text-body text-graphite mt-3 max-w-prose">
          A short tour of every part of the app. Start with the 5-minute walkthrough below, or jump
          straight to a guide on the topic you’re curious about. Everything here is paper-only —
          nothing here is investment advice.
        </p>
        <div className="mt-4 flex gap-3 flex-wrap">
          <Link href="/walkthrough" className="pv-btn-mark text-body-sm">
            Start the 5-minute walkthrough
          </Link>
          <Link href="/" className="pv-btn-ghost text-body-sm">
            Back to dashboard
          </Link>
        </div>
      </header>

      {/* "Get started in 5 minutes" visual flow */}
      <section aria-labelledby="quick-start-heading">
        <div className="flex items-baseline justify-between mb-4">
          <h2 id="quick-start-heading" className="font-serif text-h2 text-ink">
            Get started in 5 minutes
          </h2>
          <Link href="/walkthrough" className="text-caption text-graphite hover:text-ink">
            Take the tour →
          </Link>
        </div>
        <div className="pv-card p-4 sm:p-6">
          <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3 pv-stagger-fast">
            {QUICK_START_STEPS.map((step, i) => (
              <li
                key={step.n}
                className="relative p-3 rounded-md bg-fog/50 border border-fog"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-7 w-7 shrink-0 rounded-full text-caption font-medium text-bone flex items-center justify-center"
                    style={{ backgroundColor: '#7A5230' }}
                    aria-hidden
                  >
                    {step.n}
                  </div>
                  {i < QUICK_START_STEPS.length - 1 && (
                    <div
                      className="hidden sm:block flex-1 h-px bg-fog"
                      aria-hidden
                    />
                  )}
                </div>
                <p className="font-serif text-body-sm text-ink leading-snug">{step.label}</p>
                <p className="text-caption text-stone mt-1 line-clamp-3">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* All guides grid */}
      <section aria-labelledby="all-guides-heading">
        <div className="flex items-baseline justify-between mb-4">
          <h2 id="all-guides-heading" className="font-serif text-h2 text-ink">
            All guides
          </h2>
          <span className="text-caption text-stone">{GUIDES.length} topics</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pv-stagger-fast">
          {GUIDES.map((g) => (
            <GuideCard key={g.slug} guide={g} />
          ))}
        </div>
      </section>

      {/* Bottom CTA — if the user has already finished the walkthrough,
          surface the restart option here too. Otherwise, point them at
          the wizard. */}
      {user.walkthrough_completed_at ? (
        <section className="pv-card p-5 flex items-start gap-4">
          <div className="flex-1">
            <p className="pv-eyebrow mb-1">Tour</p>
            <h3 className="font-serif text-h3 text-ink">Want to take the tour again?</h3>
            <p className="text-body-sm text-graphite mt-1 max-w-prose">
              Restart the 5-minute walkthrough from your Account page.
            </p>
          </div>
          <Link href="/account" className="pv-btn-secondary text-body-sm shrink-0">
            Go to Account
          </Link>
        </section>
      ) : (
        <section className="pv-card p-5 flex items-start gap-4">
          <div className="flex-1">
            <p className="pv-eyebrow mb-1">First time?</p>
            <h3 className="font-serif text-h3 text-ink">Try the 5-minute walkthrough</h3>
            <p className="text-body-sm text-graphite mt-1 max-w-prose">
              An interactive tour with 6 short steps. Skippable at any time.
            </p>
          </div>
          <Link href="/walkthrough" className="pv-btn-mark text-body-sm shrink-0">
            Start the tour
          </Link>
        </section>
      )}
    </div>
  );
}
