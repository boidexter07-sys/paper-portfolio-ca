// T43: WalkthroughHighlight — the in-app spotlight overlay that walks
// new users through the dashboard on first login.
//
// Shape:
//   - dark backdrop (full viewport, semi-opaque stone color)
//   - a "spotlight" cutout around the target element (use a CSS box-
//     shadow inset/inset strategy instead of clipping a hole in the
//     SVG backdrop — keeps it simple and supports rounded corners
//     and any background pattern). The element itself gets a thin
//     mark-colored ring so the user knows where to look.
//   - tooltip card positioned next to the spotlight (or centered on
//     the viewport when there's no target, or the target is offscreen).
//   - Next / Skip / Done navigation in the tooltip.
//
// Renders as a portal-like fixed overlay. The component reads
// `useReducedMotion()` to skip the fade-in / scale-up animations.
//
// Props are intentionally minimal. The parent layout fetches the step
// data and passes it in. The component handles the visual layer only.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WALKTHROUGH_STEPS, markWalkthroughCompleteClient } from './_walkthrough-client';
import { useReducedMotion } from '@/lib/motion';

interface Props {
  /** Zero-based index of the step to start with (default 0). */
  initialStep?: number;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8; // px of breathing room around the spotlight cutout.
const TOOLTIP_OFFSET = 16; // px of breathing room between spotlight & tooltip.

export function WalkthroughHighlight({ initialStep = 0 }: Props) {
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPlacement, setTooltipPlacement] = useState<'below' | 'above' | 'center'>('center');
  const reduced = useReducedMotion();
  const step = WALKTHROUGH_STEPS[stepIndex];
  const rafRef = useRef<number | null>(null);

  // Lock body scroll while the overlay is mounted.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Track the target element's position. We re-measure whenever the
  // step changes or the window resizes / scrolls — the layout may
  // not yet be settled when this mounts.
  useEffect(() => {
    function findTarget(): HTMLElement | null {
      if (!step.target) return null;
      try {
        return document.querySelector(step.target) as HTMLElement | null;
      } catch {
        return null;
      }
    }

    function measure() {
      const el = findTarget();
      if (!el) {
        setRect(null);
        setTooltipPlacement('center');
        return;
      }
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      const r = el.getBoundingClientRect();
      // Clamp to viewport — if the target is offscreen we fall back to
      // centered tooltip.
      if (r.top < -10 || r.left < -10 || r.right > window.innerWidth + 10 || r.bottom > window.innerHeight + 10) {
        setRect(null);
        setTooltipPlacement('center');
        return;
      }
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
      // Prefer tooltip-below if there's room; otherwise above.
      const tooltipHeight = 220; // rough estimate; updated dynamically below
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      if (spaceBelow >= tooltipHeight + TOOLTIP_OFFSET) {
        setTooltipPlacement('below');
      } else if (spaceAbove >= tooltipHeight + TOOLTIP_OFFSET) {
        setTooltipPlacement('above');
      } else {
        setTooltipPlacement('center');
      }
    }

    measure();
    const onResize = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    // Second pass after layout settles (covers cases where the target
    // is in a Suspense boundary or below the fold during the first
    // paint).
    const t1 = window.setTimeout(measure, 50);
    const t2 = window.setTimeout(measure, 350);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [stepIndex, step.target, reduced]);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === WALKTHROUGH_STEPS.length - 1;
  const isLastEver = stepIndex === WALKTHROUGH_STEPS.length - 1;

  const finish = async () => {
    await markWalkthroughCompleteClient();
    document.body.style.overflow = '';
    window.location.assign('/');
  };

  const next = async () => {
    if (isLastEver) {
      await finish();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const skip = async () => {
    await finish();
  };

  // The "shadow" trick: render a full-viewport backdrop, then punch a
  // hole by drawing four rectangles around the target's bounding rect.
  // We use sticky-positioned divs rather than SVG/clip-path so we get
  // free rounded corners on the spotlight and no z-index wars.
  const sb = (top: number, left: number, height: number, width: number | string) =>
    top < 0 || left < 0 ? null : (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top,
          left,
          width,
          height,
          backgroundColor: 'rgba(15, 20, 25, 0.62)',
          pointerEvents: 'none',
        }}
      />
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How the app works"
      data-walk-overlay
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        opacity: reduced ? 1 : 0,
        animation: reduced ? undefined : 'pv-fade-in 280ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
      }}
    >
      {/* Backdrop with cutout built from four rectangles. */}
      {rect
        ? <>
            {sb(0, 0, rect.top, '100vw')}
            {sb(rect.top + rect.height, 0, window.innerHeight - (rect.top + rect.height), '100vw')}
            {sb(rect.top, 0, rect.height, rect.left)}
            {sb(rect.top, rect.left + rect.width, rect.height, window.innerWidth - (rect.left + rect.width))}
            {/* Outline ring around the spotlight target. */}
            <div
              aria-hidden
              style={{
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                borderRadius: 12,
                boxShadow: '0 0 0 3px #7A5230, 0 0 0 8px rgba(122, 82, 48, 0.25)',
                pointerEvents: 'none',
              }}
            />
          </>
        : (
          <div
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 20, 25, 0.62)',
            }}
          />
        )}

      {/* Tooltip card. Position depends on whether we have a target. */}
      <Tooltip
        step={step}
        stepIndex={stepIndex}
        total={WALKTHROUGH_STEPS.length}
        isFirst={isFirst}
        isLast={isLast}
        placement={tooltipPlacement}
        rect={rect}
        onNext={next}
        onSkip={skip}
      />
    </div>
  );
}

function Tooltip({
  step,
  stepIndex,
  total,
  isFirst,
  isLast,
  placement,
  rect,
  onNext,
  onSkip,
}: {
  step: (typeof WALKTHROUGH_STEPS)[number];
  stepIndex: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  placement: 'below' | 'above' | 'center';
  rect: Rect | null;
  onNext: () => void;
  onSkip: () => void;
}) {
  // Compute position. The card itself is fixed; we set top/left below.
  // The `useMemo` deliberately *returns a value during SSR*; it doesn't
  // touch `window` when rect is null (the no-target case skips the
  // positioning math, so a plain object is safe). When rect IS set, we
  // short-circuit to a centered default — the effect in the parent
  // re-measures after mount and forces a re-render with the real
  // viewport size before the user sees anything.
  const cardWidth = 360;
  const cardMaxHeight = 320;
  const margin = 12;

  const position = useMemo(() => {
    if (typeof window === 'undefined') {
      // SSR — use a centered default; the parent effect will re-measure
      // after hydration and `setRect` will re-render with a real
      // position. Avoids `window is not defined` in dev / build.
      return { top: 64, left: margin };
    }
    if (!rect || placement === 'center') {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      return { top: cy - cardMaxHeight / 2, left: Math.max(margin, cx - cardWidth / 2) };
    }
    if (placement === 'below') {
      const idealTop = rect.top + rect.height + TOOLTIP_OFFSET;
      const left = Math.max(
        margin,
        Math.min(window.innerWidth - cardWidth - margin, rect.left + rect.width / 2 - cardWidth / 2),
      );
      return { top: Math.min(idealTop, window.innerHeight - cardMaxHeight - margin), left };
    }
    // above
    const idealTop = rect.top - cardMaxHeight - TOOLTIP_OFFSET;
    const left = Math.max(
      margin,
      Math.min(window.innerWidth - cardWidth - margin, rect.left + rect.width / 2 - cardWidth / 2),
    );
    return { top: Math.max(margin, idealTop), left };
  }, [rect, placement]);

  return (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: cardWidth,
        maxWidth: `calc(100vw - ${margin * 2}px)`,
        maxHeight: cardMaxHeight,
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(15, 20, 25, 0.30), 0 4px 10px rgba(15, 20, 25, 0.18)',
        padding: 18,
        zIndex: 101,
        overflow: 'auto',
      }}
    >
      <div className="pv-eyebrow mb-1">
        Step {stepIndex + 1} of {total} {isFirst ? '· Skip if you know it' : ''}
      </div>
      <h2 className="font-serif text-h3 text-ink leading-tight">{step.title}</h2>
      <p className="text-body-sm text-graphite mt-2 max-w-prose">{step.body}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="pv-btn-ghost text-body-sm"
          style={{ marginLeft: 'auto' }}
        >
          {isLast ? 'Skip' : 'Skip tour'}
        </button>
        <button type="button" onClick={onNext} className="pv-btn-mark text-body-sm">
          {isLast ? 'Done' : 'Next'} →
        </button>
      </div>
    </div>
  );
}
