'use client';

import type { PrismResult } from '@/lib/prism';
import { PRISM_DISCLOSURE_INLINE } from '@/lib/disclosures';
import { CountUp } from './CountUp';
import { PulseBadge } from './PulseBadge';

const SIGNAL_COLORS: Record<PrismResult['signal'], { bg: string; text: string; border: string; label: string }> = {
  'Strong Paper Buy': { bg: 'bg-positive/10', text: 'text-positive', border: 'border-positive/30', label: 'Strong Paper Buy' },
  'Paper Buy': { bg: 'bg-positive/8', text: 'text-positive', border: 'border-positive/20', label: 'Paper Buy' },
  'Hold': { bg: 'bg-fog', text: 'text-graphite', border: 'border-mist', label: 'Hold' },
  'Paper Sell': { bg: 'bg-warn/10', text: 'text-warn', border: 'border-warn/20', label: 'Paper Sell' },
  'Strong Paper Sell': { bg: 'bg-negative/10', text: 'text-negative', border: 'border-negative/30', label: 'Strong Paper Sell' },
};

export function PrismCard({ prism, compact = false, ticker }: { prism: PrismResult; compact?: boolean; ticker?: string }) {
  const c = SIGNAL_COLORS[prism.signal];
  const t = ticker ?? prism.ticker;
  return (
    <div className={`pv-card p-4 sm:p-5 ${compact ? '' : 'sm:p-6'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="pv-eyebrow">Plain score</p>
          <p className={`mt-1 font-serif ${compact ? 'text-h1' : 'text-display'} pv-num text-ink leading-none`}>
            <CountUp value={prism.composite_score} duration={900} suffix="" />
          </p>
          <p className="text-caption text-stone pv-num">out of 100</p>
        </div>
        <PulseBadge ticker={t} tier={prism.signal}>
          <div className={`px-3 py-1.5 rounded-full border ${c.bg} ${c.text} ${c.border} text-body-sm font-medium`}>
            {c.label}
          </div>
        </PulseBadge>
      </div>
      <p className="mt-4 text-body text-graphite">{prism.plain_summary}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-fog/50 rounded-md p-3">
          <p className="pv-eyebrow">Technical picture</p>
          <p className="text-body-sm text-ink mt-1 pv-num">
            <CountUp value={prism.layers.L1_technical.score} duration={700} suffix="" /> <span className="text-stone">/ 100</span>
          </p>
          <p className="text-caption text-stone pv-num mt-0.5">{Math.round(prism.layers.L1_technical.weight * 100)}% weight</p>
        </div>
        <div className="bg-fog/50 rounded-md p-3">
          <p className="pv-eyebrow">Fundamental picture</p>
          <p className="text-body-sm text-ink mt-1 pv-num">
            <CountUp value={prism.layers.L2_fundamental.score} duration={700} suffix="" /> <span className="text-stone">/ 100</span>
          </p>
          <p className="text-caption text-stone pv-num mt-0.5">{Math.round(prism.layers.L2_fundamental.weight * 100)}% weight</p>
        </div>
        <div className={`rounded-md p-3 ${prism.l3_available ? 'bg-fog/50' : 'bg-fog/30 border border-dashed border-mist'}`}>
          <p className="pv-eyebrow">News &amp; sentiment</p>
          <p className="text-body-sm text-ink mt-1 pv-num">
            <CountUp value={prism.layers.L3_sentiment.score} duration={700} suffix="" /> <span className="text-stone">/ 100</span>
          </p>
          <p className="text-caption text-stone pv-num mt-0.5">
            {Math.round(prism.layers.L3_sentiment.weight * 100)}% weight
            {!prism.l3_available ? ' · cache empty' : ''}
          </p>
        </div>
      </div>
      {prism.stub && (
        <p className="mt-3 text-caption text-stone">
          Stub data — T2 engine is in flight. Final scores will be more informative.
        </p>
      )}
      <p className="mt-4 pt-3 border-t border-fog text-caption text-stone">{PRISM_DISCLOSURE_INLINE.long}</p>
    </div>
  );
}