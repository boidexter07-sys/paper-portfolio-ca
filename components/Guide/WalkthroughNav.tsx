// T43: WalkthroughNav — Previous / Next / Skip-to-dashboard nav for
// the per-step walkthrough page. Each button is a plain <Link>; the
// caller decides the destinations via props so the same component
// works on every step.
//
// `onNext` fires when the user reaches the last step — typically used
// to mark the walkthrough as complete via the API route. The page
// also calls the API on every next click so a partial completion is
// captured.

'use client';

import Link from 'next/link';

export function WalkthroughNav({
  prevHref,
  nextHref,
  onNext,
  nextLabel = 'Next',
  showSkip = true,
}: {
  prevHref: string | null;
  nextHref: string | null;
  /** Called when Next is clicked. Receives the click event so the
   *  caller can POST to /api/walkthrough/complete before navigating
   *  (the default handler is to use a Link, which navigates
   *  immediately — callers that need server work should bind to
   *  onClick, not rely on this prop). */
  onNext?: () => void;
  nextLabel?: string;
  /** Show the "Skip to dashboard" escape hatch on the right. */
  showSkip?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-fog">
      <div className="flex-1">
        {prevHref ? (
          <Link href={prevHref} className="pv-btn-ghost text-body-sm">
            ← Previous
          </Link>
        ) : (
          // Empty placeholder keeps the spacing symmetric on the first step.
          <span aria-hidden />
        )}
      </div>
      <div className="flex items-center gap-2">
        {showSkip && (
          <Link href="/" className="pv-btn-ghost text-body-sm">
            Skip to dashboard
          </Link>
        )}
        {nextHref && (
          <Link
            href={nextHref}
            onClick={onNext}
            className="pv-btn-mark text-body-sm"
          >
            {nextLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}
