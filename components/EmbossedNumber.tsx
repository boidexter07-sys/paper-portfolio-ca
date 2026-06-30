'use client';

// EmbossedNumber — Option A Accent 2.
// Renders a number (or any text) with an inset text-shadow so the figure
// reads as engraved into the card. The shadow tints with the value's color:
// positive = green-tinted, negative = red-tinted, neutral = ink-tinted.
//
// Honors prefers-reduced-motion via .pv-embossed-* CSS rules (no animation;
// static shadow only — fully usable in the reduced-motion fallback).
//
// T40: number formatting now uses Intl.NumberFormat so values like 50063
// render as "$50,063" with thousand separators instead of "$50063".

import { formatCountUp } from '@/lib/motion';

export type EmbossedNumberProps = {
  value: number;
  /** Sign-aware color treatment. Default "auto" picks by sign of value. */
  tone?: 'auto' | 'positive' | 'negative' | 'ink';
  /** Decimals to render. Default 0 for integers, 2 for money. */
  decimals?: number;
  /** Currency prefix (e.g. "$"). Default none. */
  prefix?: string;
  /** Whether to show "+" on positive numbers (P&L style). Default false. */
  sign?: boolean;
  /** Suffix (e.g. "%"). */
  suffix?: string;
  /** Optional className passthrough. */
  className?: string;
};

export function EmbossedNumber({
  value,
  tone = 'auto',
  decimals,
  prefix = '',
  sign = false,
  suffix = '',
  className,
}: EmbossedNumberProps) {
  let effectiveTone = tone;
  if (tone === 'auto') {
    if (value > 0) effectiveTone = 'positive';
    else if (value < 0) effectiveTone = 'negative';
    else effectiveTone = 'ink';
  }

  const effectiveDecimals = decimals ?? (Number.isInteger(value) ? 0 : 2);
  // Use formatCountUp's sign handling so "+/-" renders before the prefix
  // (e.g. "+$23,578" not "$+23,578"). The caller-supplied `prefix` should
  // NOT include the sign character.
  const formatted = formatCountUp(value, {
    decimals: effectiveDecimals,
    prefix,
    suffix,
    sign,
  });

  const toneClass =
    effectiveTone === 'positive'
      ? 'pv-embossed-positive'
      : effectiveTone === 'negative'
      ? 'pv-embossed-negative'
      : 'pv-embossed-ink';

  return <span className={`${toneClass} ${className ?? ''}`}>{formatted}</span>;
}