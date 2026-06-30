'use client';

import { useId, useMemo } from 'react';
import {
  MIN_PORTFOLIO_CASH_CAD,
  MAX_PORTFOLIO_CASH_CAD,
  DEFAULT_PORTFOLIO_CASH_CAD,
  CASH_STEP_CAD,
} from '@/lib/constants';

const QUICK_PICKS = [50_000, 100_000, 250_000, 500_000, 1_000_000];

function formatCashShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function formatCashFull(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  value: number;
  onChange: (v: number) => void;
  /** Compact label for the eyebrow row above the slider (e.g. "Starting cash"). */
  label?: string;
  /** Hide the live full-currency display (used when callers render it
   *  elsewhere, like a headline above the slider). */
  hideLiveValue?: boolean;
  /** aria-label for the slider input itself. */
  ariaLabel?: string;
};

/**
 * T41: Reusable slider for picking paper-trade starting cash.
 * - Range: $50,000 to $1,000,000
 * - Step: $10,000 (browser snaps via step attribute; we also round onChange
 *   as a belt-and-suspenders in case the user pastes a non-step value)
 * - Live formatted display ($100,000 not 100000)
 * - Quick-pick buttons: $50K, $100K, $250K, $500K, $1M
 *
 * Validation lives server-side (lib/constants.validateStartingCash); this
 * component snaps to the step so it can never emit an invalid value, which
 * means the server will always accept it.
 */
export function CashSlider({ value, onChange, label, hideLiveValue, ariaLabel }: Props) {
  const reactId = useId();
  const sliderId = `cash-slider-${reactId}`;

  // Snap helper — keeps the slider in sync with the step attribute even if
  // an external caller passes a non-step value (e.g. URL param).
  const snap = (n: number) => {
    if (!Number.isFinite(n)) return DEFAULT_PORTFOLIO_CASH_CAD;
    const clamped = Math.max(MIN_PORTFOLIO_CASH_CAD, Math.min(MAX_PORTFOLIO_CASH_CAD, n));
    return Math.round(clamped / CASH_STEP_CAD) * CASH_STEP_CAD;
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    onChange(snap(n));
  };

  const ticks = useMemo(() => {
    // 5 round tick marks across the range so the slider feels calibrated
    // without showing ugly fractional values like "$287K". The actual slider
    // step is still $10K; ticks are display-only.
    return [50_000, 300_000, 550_000, 800_000, 1_000_000];
  }, []);

  const minPct = ((value - MIN_PORTFOLIO_CASH_CAD) / (MAX_PORTFOLIO_CASH_CAD - MIN_PORTFOLIO_CASH_CAD)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        {label && <label htmlFor={sliderId} className="block text-caption text-graphite">{label}</label>}
        {!hideLiveValue && (
          <p className="font-serif text-h1 text-ink pv-num" aria-live="polite">
            {formatCashFull(value)}
          </p>
        )}
      </div>
      <input
        id={sliderId}
        type="range"
        min={MIN_PORTFOLIO_CASH_CAD}
        max={MAX_PORTFOLIO_CASH_CAD}
        step={CASH_STEP_CAD}
        value={value}
        onChange={handleSlider}
        aria-label={ariaLabel ?? label ?? 'Starting cash amount'}
        className="pv-cash-slider"
        style={{
          // CSS var so the fill renders correctly without a custom plugin.
          ['--pv-cash-pct' as any]: `${minPct}%`,
        }}
      />
      <div className="flex justify-between text-caption text-stone pv-num" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t}>{formatCashShort(t)}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_PICKS.map((qp) => {
          const active = value === qp;
          return (
            <button
              key={qp}
              type="button"
              onClick={() => onChange(snap(qp))}
              className={`pv-quickpick ${active ? 'pv-quickpick--active' : ''}`}
              aria-pressed={active}
            >
              {formatCashShort(qp)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Re-export formatters so the modal can use the same display style without
// duplicating the locale / thousand-separator logic.
export { formatCashFull, formatCashShort };