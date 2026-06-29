// Display labels, copy, and colors for the call-tier filter pills.
// Centralized here so /discover, the Stock Profile hero, and Hot Picks all
// stay in sync. Copy is paper-only, non-directive (per forbidden-phrases.md).

export type CallTier = 'buy' | 'hold' | 'sell';

export const CALL_TIER_LABELS: Record<CallTier, { label: string; hint: string }> = {
  buy: { label: 'Buy signal', hint: 'Stocks currently flashing a paper-buy signal' },
  hold: { label: 'Hold', hint: 'Stocks where the model sees no clear direction' },
  sell: { label: 'Sell signal', hint: 'Stocks flashing a paper-sell signal — review before adding' },
};

export const CALL_TIER_STYLES: Record<
  CallTier,
  { active: string; inactive: string; badge: string }
> = {
  buy: {
    active: 'bg-positive text-bone border-positive',
    inactive: 'bg-bone text-graphite border-fog hover:border-positive/40',
    badge: 'bg-positive/10 text-positive border-positive/30',
  },
  hold: {
    active: 'bg-fog text-ink border-graphite',
    inactive: 'bg-bone text-graphite border-fog hover:border-graphite/40',
    badge: 'bg-fog text-graphite border-mist',
  },
  sell: {
    active: 'bg-warn text-bone border-warn',
    inactive: 'bg-bone text-graphite border-fog hover:border-warn/40',
    badge: 'bg-warn/10 text-warn border-warn/30',
  },
};
