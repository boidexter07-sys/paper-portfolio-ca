// Paper Portfolio Canada motion library.
//
// Six canonical animations, each with a prefers-reduced-motion fallback:
//   1. Count-up   — useCountUp()
//   2. Draw-in    — useDrawIn() + <ChartLineDraw>
//   3. Pulse      — useTierPulse() (writes localStorage lastTierSeen)
//   4. Shimmer    — CSS-only, see globals.css .pv-shimmer
//   5. Pop        — CSS class .pv-pop (Framer-free)
//   6. Stagger    — CSS class .pv-stagger > * (Framer-free)
//
// Reduced-motion detection: useReducedMotion() reads matchMedia. Returns true
// when the user has prefers-reduced-motion: reduce OR the device is low-end
// (navigator.deviceMemory < 4). SSR-safe — defaults to "motion enabled"
// (false) on the server; the client updates the value on first effect.

'use client';

import { useEffect, useRef, useState } from 'react';

// ----------------------------------------------------------------------------
// Reduced-motion detection
// ----------------------------------------------------------------------------

/**
 * Returns true when motion should be suppressed.
 * - Honors prefers-reduced-motion: reduce (WCAG AAA)
 * - Honors low-end devices (navigator.deviceMemory < 4 GB)
 *
 * SSR-safe: returns false during server render; the client updates on mount.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(!!mql.matches);

    // Some browsers don't support deviceMemory — treat absence as "not low-end".
    const lowEnd =
      (navigator as unknown as { deviceMemory?: number }).deviceMemory != null &&
      (navigator as unknown as { deviceMemory?: number }).deviceMemory! < 4;

    update();
    setReduced(!!mql.matches || lowEnd);

    // matchMedia.addEventListener is widely supported but Safari < 14 needs
    // addListener. Feature-detect.
    if (mql.addEventListener) {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    } else {
      // Fallback for old Safari.
      // eslint-disable-next-line deprecation/deprecation
      mql.addListener(update);
      return () => {
        // eslint-disable-next-line deprecation/deprecation
        mql.removeListener(update);
      };
    }
  }, []);

  return reduced;
}

// ----------------------------------------------------------------------------
// Count-up hook — animates an integer or float from 0 to target over duration.
// Honors prefers-reduced-motion: returns target immediately.
// ----------------------------------------------------------------------------

export type CountUpOpts = {
  duration?: number;       // ms — default 800 (per motion grammar §4.1 spec)
  startFrom?: number;      // default 0
  decimals?: number;       // default 0 for integers, 2 for prices
  easing?: 'standard' | 'decel-spring' | 'linear';
};

export function useCountUp(target: number, opts: CountUpOpts = {}): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : (opts.startFrom ?? 0));
  const startFromRef = useRef<number>(opts.startFrom ?? 0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef<number>(target);

  useEffect(() => {
    targetRef.current = target;
    if (reduced) {
      setValue(target);
      return;
    }
    startFromRef.current = value;
    const start = performance.now();
    const duration = opts.duration ?? 800;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = opts.easing === 'linear' ? t : easeOutCubic(t);
      const v = startFromRef.current + (targetRef.current - startFromRef.current) * e;
      setValue(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(targetRef.current);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced]);

  return value;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ----------------------------------------------------------------------------
// useScrollFade — T47
// Returns [ref, visible]. Pair with .pv-scroll-fade in globals.css:
//
//   const [ref, visible] = useScrollFade<HTMLDivElement>();
//   <div ref={ref} className={`pv-scroll-fade${visible ? ' is-visible' : ''}`}>...</div>
//
// Behavior:
//   - One-shot IntersectionObserver (default threshold 0.15, rootMargin
//     `0px 0px -10% 0px`) — once the element crosses into view, .is-visible
//     sticks and the observer disconnects.
//   - Honors useReducedMotion(): returns visible=true immediately, no observer.
//   - SSR-safe: returns visible=false during server render (no hydration
//     mismatch — element renders visible without the data-pending attr).
//   - Falls back to visible=true if IntersectionObserver is missing so the
//     page is never blank in very old browsers.
//   - Above-fold elements at mount time are marked visible without going
//     through the pending state — they were never below the fold, so we
//     skip the fade-in entirely. This keeps full-page screenshots and
//     SSR rendering showing all content.
// ----------------------------------------------------------------------------

export function useScrollFade<T extends Element = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string } = {}
): [React.RefObject<T>, boolean] {
  const { threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = options;
  const reduced = useReducedMotion();
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(reduced ? true : false);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    // Already in viewport at mount? No fade-in needed.
    const rect = el.getBoundingClientRect();
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    if (rect.top < vh && rect.bottom > 0) {
      setVisible(true);
      return;
    }
    // Below the fold — opt into the fade-in by tagging data-pv-fade-pending.
    el.setAttribute('data-pv-fade-pending', '1');
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        }
      },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, reduced]);

  return [ref, visible];
}

// ----------------------------------------------------------------------------
// Format helpers — keep the display logic out of the component.
//
// T40: formatCountUp now uses Intl.NumberFormat for the integer part so
// values like 50063 render as "50,063" with thousand separators. The
// fractional portion (when decimals > 0) is appended manually so the
// animated intermediate values still show the right precision (e.g.
// 23578.42 → "+23,578.42" rather than "+23,578.4199999"). Sign handling
// is delegated to the caller via the `prefix` option so we don't double
// up on "+/-" when both `sign` and `prefix` are used.
// ----------------------------------------------------------------------------

const _intlCache = new Map<string, Intl.NumberFormat>();
function getIntlFormatter(locale: string): Intl.NumberFormat {
  let f = _intlCache.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    _intlCache.set(locale, f);
  }
  return f;
}

export type FormatCountUpOpts = {
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** BCP-47 locale tag. Default 'en-CA' for CAD contexts. */
  locale?: string;
  /**
   * If true, render a leading "+" for positive values and "-" for negative.
   * Renders before `prefix`. Use this for P&L style numbers where the sign
   * appears before the currency symbol (e.g. "+$23,578"). When true, the
   * `prefix` should NOT include "+" or "-".
   */
  sign?: boolean;
};

export function formatCountUp(v: number, options: FormatCountUpOpts = {}): string {
  const decimals = options.decimals ?? 0;
  const locale = options.locale ?? 'en-CA';
  const useSign = options.sign === true;
  // Negative numbers always carry their "-". The "+" for positive numbers
  // only renders when the caller explicitly opts in via `sign` (used for
  // P&L style numbers — "+$23,578" / "-$1,234" / "$50,063"). Without the
  // flag, positives render bare (counts, scores, etc.).
  const signStr = v < 0 ? '-' : useSign ? '+' : '';
  const abs = Math.abs(v);
  const formatter = getIntlFormatter(locale);
  let body: string;
  if (decimals <= 0) {
    body = formatter.format(Math.round(abs));
  } else {
    // Split integer and fractional manually so we get thousand separators
    // on the integer half and exact decimals on the fractional half.
    const fixed = abs.toFixed(decimals);
    const dot = fixed.indexOf('.');
    const intPart = dot === -1 ? fixed : fixed.slice(0, dot);
    const fracPart = dot === -1 ? '' : fixed.slice(dot);
    body = `${formatter.format(parseInt(intPart || '0', 10))}${fracPart}`;
  }
  return `${signStr}${options.prefix ?? ''}${body}${options.suffix ?? ''}`;
}

// ----------------------------------------------------------------------------
// Draw-in hook — returns 0 (invisible) → 1 (fully drawn) over duration.
// Used by PriceChart to animate stroke-dashoffset on the SVG line.
// ----------------------------------------------------------------------------

export function useDrawIn(active: boolean, durationMs = 1200): number {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced || !active ? 1 : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setProgress(reduced ? 1 : 0);
      return;
    }
    if (reduced) {
      setProgress(1);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const e = easeOutCubic(t);
      setProgress(e);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, durationMs, reduced]);

  return progress;
}

// ----------------------------------------------------------------------------
// Signal-tier pulse — reads localStorage for lastTierSeen[ticker]. Returns
// true on the first render where the current tier differs from the stored one
// (so the chip can run its pulse animation). Honors prefers-reduced-motion.
// ----------------------------------------------------------------------------

export function useTierPulse(ticker: string, currentTier: string): boolean {
  const reduced = useReducedMotion();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (reduced) {
      setPulse(false);
      return;
    }
    if (typeof window === 'undefined') return;
    const key = `pv:lastTier:${ticker}`;
    const last = window.localStorage.getItem(key);
    if (last !== currentTier) {
      setPulse(true);
      window.localStorage.setItem(key, currentTier);
      // Auto-clear the pulse after the animation completes (600ms).
      const t = window.setTimeout(() => setPulse(false), 700);
      return () => window.clearTimeout(t);
    }
  }, [ticker, currentTier, reduced]);

  return pulse;
}

// ----------------------------------------------------------------------------
// In-viewport detection — IntersectionObserver-based, used to trigger count-up
// or draw-in only when the element is visible. Honors prefers-reduced-motion
// (returns true immediately when motion is disabled).
// ----------------------------------------------------------------------------

export function useInView<T extends Element = Element>(
  options: { threshold?: number; once?: boolean } = {}
): [React.RefObject<T>, boolean] {
  const { threshold = 0.2, once = true } = options;
  const reduced = useReducedMotion();
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(reduced ? true : false);

  useEffect(() => {
    if (reduced) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once, reduced]);

  return [ref, inView];
}