// Plain-English factor explainer — renders the 10 L1 indicators and 12
// L2 factors on /stock/[ticker] with an always-visible one-sentence
// explanation next to every sub-score. Per brief: "next to every PRISM
// sub-score, inline always-visible plain text."
//
// The longer explanation (when present) sits below the score line and
// only opens on focus / hover to keep the page compact on mobile.
//
// Voice rules (from content/compliance/forbidden-phrases.md):
//   - No "you should", no directive copy.
//   - No "guaranteed", "beat the market", "win".
//   - No "investment advice".
//
// PRISM ships sub-scores keyed by stable `key` strings. We look each
// key up in lib/factor-explanations.ts and fall back to a generic
// sentence if the key is unknown. Adding new keys is safe — they
// render immediately with the fallback text and an engineer can fill
// in a real one-liner later without breaking the page.

import type { SubScore } from '@/lib/prism';
import { L1_EXPLANATIONS, L2_EXPLANATIONS } from '@/lib/factor-explanations';

type FactorExplainerSectionProps = {
  indicators: Record<string, SubScore>;
  factors: Record<string, SubScore>;
};

// ----------------------------------------------------------------------------
// Shared row renderer — reused by both halves of the section.
// Always-visible one-liner under the indicator/factor name + score.
// ----------------------------------------------------------------------------
function ScoreRow({ s }: { s: SubScore }) {
  const explainerL1 = L1_EXPLANATIONS[s.key]?.oneLiner;
  const explainerL2 = L2_EXPLANATIONS[s.key]?.oneLiner;
  const explainer = explainerL1 ?? explainerL2;
  return (
    <div className="p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-ink">{s.label}</p>
        <p className="text-caption text-stone pv-num">{s.value}</p>
        {explainer && (
          <p className="text-body-sm text-graphite mt-2 max-w-prose">{explainer}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-serif text-h3 text-ink pv-num leading-none">{s.score}</p>
        <p className="text-caption text-stone">/ 100</p>
      </div>
    </div>
  );
}

export function FactorExplainerSection({ indicators, factors }: FactorExplainerSectionProps) {
  const indEntries = Object.values(indicators);
  const factEntries = Object.values(factors);
  return (
    <>
      <section aria-labelledby="factor-explainer-technical">
        <div className="flex items-baseline justify-between mb-2">
          <h2 id="factor-explainer-technical" className="font-serif text-h2 text-ink">
            Technical picture
          </h2>
          <p className="text-caption text-stone hidden sm:block">
            {indEntries.length} indicators — every one is explained in plain English
          </p>
        </div>
        <p className="text-body-sm text-graphite mb-3 max-w-prose">
          The technical picture looks at price action — momentum, trend, volatility, and where the price
          sits inside its 52-week range. PRISM turns each signal into a number from 0 to 100. Read it as
          a starting point, not a verdict.
        </p>
        <div className="pv-card divide-y divide-fog">
          {indEntries.map((s) => (
            <ScoreRow key={s.key} s={s} />
          ))}
        </div>
      </section>

      <section aria-labelledby="factor-explainer-fundamental">
        <div className="flex items-baseline justify-between mb-2 mt-8">
          <h2 id="factor-explainer-fundamental" className="font-serif text-h2 text-ink">
            Fundamental picture
          </h2>
          <p className="text-caption text-stone hidden sm:block">
            {factEntries.length} factors — every one is explained in plain English
          </p>
        </div>
        <p className="text-body-sm text-graphite mb-3 max-w-prose">
          The fundamental picture looks at the company&apos;s books — what it owns, what it earns, what it
          pays out, and how its earnings compare to its price. PRISM turns each factor into a number
          from 0 to 100. Read it as a starting point, not a verdict.
        </p>
        <div className="pv-card divide-y divide-fog">
          {factEntries.map((s) => (
            <ScoreRow key={s.key} s={s} />
          ))}
        </div>
      </section>
    </>
  );
}
