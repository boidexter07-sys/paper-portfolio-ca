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
// Format helpers — keep the display logic out of the component.
// ----------------------------------------------------------------------------

export function formatCountUp(
  v: number,
  options: { decimals?: number; prefix?: string; suffix?: string }
): string {
  const decimals = options.decimals ?? 0;
  return `${options.prefix ?? ''}${v.toFixed(decimals)}${options.suffix ?? ''}`;
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