'use client';

// PlainScoreCoin — Option A Accent 1.
// Round embossed "coin" rendered with dual neumorphic shadows. Pressed
// state inverts the shadows to concave (matches v5-neumorphism-tokens.md
// §5 press-state rule). Honors prefers-reduced-motion via the .pv-coin
// CSS rule (which has @media query support).
//
// Used as the hero element on the Stock Profile page. The Plain Score
// number inside the coin is animated by <CountUp>.
//
// T28: score is rendered as an INTEGER (Math.round + clamp 0–100). The
// underlying model may produce a float like 62.4, but the on-screen
// score is always a whole number 0–100 ("62", "75", "100"). Three sizes:
//   sm = 96px (PV-coin-sm)
//   md = 128px (PV-coin default)
//   lg = 160px (PV-coin-lg, NEW — gives 3-digit scores like "100" room
//       to breathe inside the circle without overflow)

import { CountUp } from './CountUp';

export type PlainScoreCoinProps = {
  score: number;             // 0–100 (float allowed; rendered as rounded integer)
  size?: 'sm' | 'md' | 'lg'; // 96 / 128 / 160 px
  label?: string;            // "out of 100" or similar
  ariaLabel?: string;
};

/** Round a Plain Score to its on-screen integer value, clamped to [0, 100]. */
function integerScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function PlainScoreCoin({ score, size = 'md', label = 'out of 100', ariaLabel }: PlainScoreCoinProps) {
  const displayScore = integerScore(score);
  const sizeClass =
    size === 'sm' ? 'pv-coin-sm' : size === 'lg' ? 'pv-coin-lg' : '';
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
        aria-label={ariaLabel ?? `Plain Score ${displayScore} out of 100`}
      >
        <div className="flex flex-col items-center leading-none">
          <span className={`font-serif font-extrabold text-ink ${numClass} pv-num`}>
            <CountUp value={displayScore} duration={900} />
          </span>
          <span className={`font-sans uppercase tracking-[0.14em] text-stone ${lblClass} mt-1`}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}