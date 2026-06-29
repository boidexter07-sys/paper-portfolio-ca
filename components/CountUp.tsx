'use client';

// CountUp — animates a numeric value from 0 (or a previous value) to the
// target over `duration` ms, using requestAnimationFrame and easeOutCubic.
// Honors prefers-reduced-motion: returns the target immediately.
//
// Used for:
//   - Plain Score (0–100, integer)
//   - Portfolio value ($X,XXX.XX, 2 decimals)
//   - P&L ($+X,XXX.XX, 2 decimals, signed)
//   - Stock price ($XX.XX, 2 decimals)

import { useCountUp, formatCountUp } from '@/lib/motion';

export type CountUpProps = {
  value: number;
  /** Number of decimal places to render. Default 0 for integers, 2 for prices. */
  decimals?: number;
  /** Prefix (e.g. "+" for P&L, "$" for prices). */
  prefix?: string;
  /** Suffix (e.g. "%", " / 100"). */
  suffix?: string;
  /** Duration in ms. Default 800 (per motion grammar §4.1 spec). */
  duration?: number;
  /** Optional className passthrough for sizing/coloring. */
  className?: string;
};

export function CountUp({
  value,
  decimals,
  prefix,
  suffix,
  duration = 800,
  className,
}: CountUpProps) {
  const v = useCountUp(value, { duration, decimals });
  const effectiveDecimals = decimals ?? (Number.isInteger(value) ? 0 : 2);
  return (
    <span className={className}>
      {formatCountUp(v, { decimals: effectiveDecimals, prefix, suffix })}
    </span>
  );
}