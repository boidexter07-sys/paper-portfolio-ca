'use client';

// PlainScoreCoin — Option A Accent 1.
// Round embossed "coin" rendered with dual neumorphic shadows. Pressed
// state inverts the shadows to concave (matches v5-neumorphism-tokens.md
// §5 press-state rule). Honors prefers-reduced-motion via the .pv-coin
// CSS rule (which has @media query support).
//
// Used as the hero element on the Stock Profile page. The Plain Score
// number inside the coin is animated by <CountUp>.

import { CountUp } from './CountUp';

export type PlainScoreCoinProps = {
  score: number;             // 0–100
  size?: 'sm' | 'md' | 'lg'; // 96 / 128 / 144 px
  label?: string;            // "out of 100" or similar
  ariaLabel?: string;
};

export function PlainScoreCoin({ score, size = 'md', label = 'out of 100', ariaLabel }: PlainScoreCoinProps) {
  const sizeClass = size === 'sm' ? 'pv-coin-sm' : '';
  const numClass =
    size === 'sm'
      ? 'text-3xl'
      : size === 'lg'
      ? 'text-6xl'
      : 'text-5xl';
  const lblClass = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div
        className={`pv-coin ${sizeClass}`}
        role="img"
        aria-label={ariaLabel ?? `Plain Score ${score} out of 100`}
      >
        <div className="flex flex-col items-center leading-none">
          <span className={`font-serif font-extrabold text-ink ${numClass} pv-num`}>
            <CountUp value={score} duration={900} />
          </span>
          <span className={`font-sans uppercase tracking-[0.14em] text-stone ${lblClass} mt-1`}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}