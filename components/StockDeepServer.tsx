// Server-only render of the full deep-dive page body.
// Wrapped in <Suspense> on the page so a slow computePrism() does not block.

import Link from 'next/link';
import { computePrism } from '@/lib/prism';
import { priceHistoryFor, getStock } from '@/lib/stocks';
import { PRICE_HISTORY_LOOKBACK } from '@/lib/constants';
import { PriceChart } from './PriceChart';
import { NewsSentimentServer } from './NewsSentimentServer';
import { FactorExplainerSection } from './FactorExplainerSection';

export async function StockDeepServer({ ticker }: { ticker: string }) {
  const stock = getStock(ticker);
  if (!stock) return null;
  const history = priceHistoryFor(stock.ticker, PRICE_HISTORY_LOOKBACK);
  const prism = computePrism(stock.ticker);

  const l4l5 = prism.layers.L4_L5_baseline || prism.layers.baseline_placeholder;
  const l3 = prism.layers.L3_sentiment;
  const l3Available = prism.l3_available;

  return (
    <>
      {/* News / sentiment layer (T22) — comes before the technical/fundamental
          breakdown so the user reads the softest signal first. */}
      <NewsSentimentServer ticker={stock.ticker} />

      {/* T21 factor explainer — all 10 L1 indicators and all 12 L2 factors,
          each with a one-sentence plain-English explanation next to the score. */}
      <FactorExplainerSection
        indicators={prism.layers.L1_technical.indicators || {}}
        factors={prism.layers.L2_fundamental.factors || {}}
      />

      <section>
        <h2 className="font-serif text-h2 text-ink mb-3">Full price history</h2>
        {history.length > 0 ? (
          <div className="pv-card p-4">
            <PriceChart data={history} height={320} />
          </div>
        ) : (
          <div className="pv-card p-4 text-body-sm text-stone">No price history available.</div>
        )}
      </section>

      <section>
        <div className="pv-card p-4 sm:p-5">
          <p className="pv-eyebrow mb-2">Where the score comes from</p>
          <pre className="text-caption text-stone overflow-x-auto whitespace-pre-wrap">
{`Technical picture   score=${prism.layers.L1_technical.score.toFixed(1)}  weight=${prism.layers.L1_technical.weight}  contribution=${prism.layers.L1_technical.contribution.toFixed(1)}
Fundamental picture score=${prism.layers.L2_fundamental.score.toFixed(1)}  weight=${prism.layers.L2_fundamental.weight}  contribution=${prism.layers.L2_fundamental.contribution.toFixed(1)}
News & sentiment    score=${l3.score.toFixed(1)}  weight=${l3.weight}  contribution=${l3.contribution.toFixed(1)}  ${l3Available ? '' : '(no data yet — scored 50 as neutral)'}
Baseline placeholder (held in reserve) score=${l4l5.score.toFixed(1)}  weight=${l4l5.weight}  contribution=${l4l5.contribution.toFixed(1)}
-----------------------------------------------------------------
Plain score = (${prism.layers.L1_technical.score.toFixed(1)} × ${prism.layers.L1_technical.weight}) + (${prism.layers.L2_fundamental.score.toFixed(1)} × ${prism.layers.L2_fundamental.weight}) + (${l3.score.toFixed(1)} × ${l3.weight}) + (${l4l5.score.toFixed(1)} × ${l4l5.weight}) = ${prism.composite_score.toFixed(1)} / 100`}
          </pre>
          <p className="text-caption text-stone mt-3">
            Numbers are paper-portfolio signals. They are not investment advice.
          </p>
        </div>
      </section>

      <div className="text-center pt-2">
        <Link href={`/stock/${stock.ticker}`} className="pv-link text-body-sm">← Back to {stock.ticker}</Link>
      </div>
    </>
  );
}
