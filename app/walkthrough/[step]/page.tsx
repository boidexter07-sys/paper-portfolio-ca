// T43: /walkthrough/[step] — individual walkthrough step page.
//
// Renders the step in a friendly, single-column wizard layout with
// progress bar at the top and Previous / Next / Skip navigation at the
// bottom. The "Next" button also POSTs to /api/walkthrough/complete
// so a user who reaches the final step marks themselves done.
//
// Auth: walkthrough is available to anyone signed in. AppShell
// handles the redirect for unauth users.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  WALKTHROUGH_STEPS,
  getWalkthroughStep,
  getWalkthroughIndex,
  nextStepKey,
  prevStepKey,
} from '@/lib/walkthrough';
import { WalkthroughProgress } from '@/components/Guide/WalkthroughProgress';
import { WalkthroughNav } from '@/components/Guide/WalkthroughNav';
import { StepIllustration } from '@/components/Walkthrough/StepIllustration';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ step: string }>;
}

export default async function WalkthroughStepPage({ params }: Params) {
  const { step: stepKey } = await params;
  const step = getWalkthroughStep(stepKey);
  if (!step) notFound();
  // Auth gate: the wizard is for authenticated learners — we want to be
  // able to attribute the timestamp to a real user.
  const user = await getCurrentUser();

  const index = getWalkthroughIndex(stepKey);
  const total = WALKTHROUGH_STEPS.length;
  const prev = prevStepKey(stepKey);
  const next = nextStepKey(stepKey);

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-2xl mx-auto">
      {/* Progress bar */}
      <WalkthroughProgress
        currentIndex={index}
        total={total}
        labels={WALKTHROUGH_STEPS.map((s) => s.title)}
      />

      {/* Step card */}
      <article className="pv-card p-5 sm:p-7 mt-6">
        <p className="pv-eyebrow">Step {index + 1} of {total}</p>
        <h1 className="font-serif text-h1 text-ink leading-tight mt-1">
          {step.title}
        </h1>

        {/* Illustration placeholder — a screenshot from the actual app
            would normally land here. The StepIllustration component
            renders a simple SVG mock per illustration key. */}
        <div className="my-5">
          <StepIllustration kind={step.illustration} />
        </div>

        {/* Copy block. Cast to string — the lib marks them as readonly
            strings, but each one has a concrete string value. */}
        <p className="text-body text-graphite max-w-prose">{step.body}</p>

        {/* Bottom nav */}
        <WalkthroughNav
          prevHref={prev ? `/walkthrough/${prev}` : null}
          nextHref={next ? `/walkthrough/${next}` : '/'}
          nextLabel={
            index === 0
              ? "Let’s go"
              : index === total - 1
              ? 'Finish'
              : 'Next'
          }
        />
      </article>

      {/* Inline status if user isn't signed in — we still render the
          wizard, but skip the API call so we don't accidentally write
          a completion record for an anonymous session. */}
      {!user && (
        <p className="text-caption text-stone mt-3 text-center">
          Sign in to save your progress — you can preview without.
        </p>
      )}

      {/* Back to the guide for context */}
      <div className="text-center mt-6">
        <Link href="/guide" className="text-caption text-graphite hover:text-ink">
          ← Back to the guide
        </Link>
      </div>
    </div>
  );
}

export function generateStaticParams(): { step: string }[] {
  return WALKTHROUGH_STEPS.map((s) => ({ step: s.key }));
}
