'use client';

// PulseBadge — Option B animation #3 (Pulse: signal tier change).
//
// Wraps the PRISM signal tier chip and runs a single 600ms pulse animation
// when the tier differs from the last one we stored in localStorage for
// this ticker. Honors prefers-reduced-motion: returns a static chip with
// no animation (still works visually — just no pulse).
//
// Use:
//   <PulseBadge ticker="AAPL" tier="Paper Buy" bgClass="..." textClass="...">
//     Paper Buy
//   </PulseBadge>

import { useTierPulse } from '@/lib/motion';

export type PulseBadgeProps = {
  ticker: string;
  tier: string;
  className?: string;
  children: React.ReactNode;
};

export function PulseBadge({ ticker, tier, className, children }: PulseBadgeProps) {
  const pulse = useTierPulse(ticker, tier);
  return (
    <span className={`${pulse ? 'pv-pulse' : ''} ${className ?? ''}`}>
      {children}
    </span>
  );
}