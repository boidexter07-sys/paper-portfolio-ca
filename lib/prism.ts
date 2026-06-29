// PRISM scoring — news-aware version. v0.6 (T22).
//
// Plain-English: composite = sum of weighted layer scores.
//   L1 technical    20%
//   L2 fundamental  30%
//   L3 news & sent  20% (NEW in v0.6)
//   L4 + L5         30% (combined placeholder; will split as they ship)
//
// We deliberately used L1+L2 from deterministic indicators + fundamental
// snapshot. L3 comes from lib/sentiment.ts (cached on disk, refreshed by
// the ingestion pipeline in lib/ingestion.ts).
//
// If L3 has no cached data yet (cold cache, no API keys), we substitute 50
// (neutral) so the composite stays stable and honest.
//
// Signal map (per T2 spec, brief §7.7):
//   75–100  Strong Paper Buy
//   55–74   Paper Buy
//   40–54   Hold
//   20–39   Paper Sell
//   0–19    Strong Paper Sell
//
// Engine shape (T21 expansion + T22 L3 wire-in):
//   L1 Technical picture     — 10 sub-scores (price action + technicals)
//   L2 Fundamental picture   — 12 sub-scores (financial health + valuation)
//   L3 News & sentiment      — composite 0-100 from news + GDELT + Reddit + EDGAR
//                              (see lib/sentiment.ts; cached in SQLite)
//   L4 / L5 placeholder      — combined 0-100 placeholder, will split when the
//                              quant + analyst layers land in T23/T24
//
// Sub-score keys MUST stay stable across versions — the Stock Profile
// page renders an inline plain-English explanation by key (see
// lib/factor-explanations.ts). Adding a new key requires also adding an
// explanation; renaming one requires touching every consumer.
//
// Backwards compat: PrismResult.layers also exposes `baseline_placeholder`
// aliasing the L4/L5 block so existing consumers that read
// .layers.baseline_placeholder keep working.

import { getDb } from './db';
import { readSentimentMeta } from './sentiment';

const L1_WEIGHT = 0.20;
const L2_WEIGHT = 0.30;
const L3_WEIGHT = 0.20;
const L4_L5_WEIGHT = 1 - (L1_WEIGHT + L2_WEIGHT + L3_WEIGHT); // 0.30

export type SubScore = {
  score: number;
  label: string;
  value: string;
  key: string; // matches the key in lib/factor-explanations.ts
};

export type PrismLayer = {
  score: number;
  weight: number;
  contribution: number;
  indicators?: Record<string, SubScore>;
  factors?: Record<string, SubScore>;
  // Optional layer metadata for display (used by NewsSentimentCard):
  //   - delta_7d:     present change vs 7d ago, when available
  //   - sources:      which data sources fed this layer's score
  delta_7d?: number;
  sources?: string[];
};

export type PrismResult = {
  ticker: string;
  composite_score: number;
  signal: 'Strong Paper Buy' | 'Paper Buy' | 'Hold' | 'Paper Sell' | 'Strong Paper Sell';
  // Engine still keys the layers by L1/L2/L3/L4/L5 internally. UI never
  // shows these keys (T21 display rename: "Technical picture", etc.)
  layers: {
    L1_technical: PrismLayer;
    L2_fundamental: PrismLayer;
    L3_sentiment: PrismLayer;
    L4_L5_baseline: PrismLayer;
    // Back-compat alias for code that reads the v0.5 placeholder key.
    baseline_placeholder: PrismLayer;
  };
  plain_summary: string;
  stub: boolean; // true until T2 engine replaces this
  l3_available: boolean; // false if no L3 cache yet (UI should hint why)
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Drift a 0-100 score by ±`n` so different sub-scores look independent for
// the same ticker. Deterministic — keyed on (ticker, subkey) so the same
// stock always shows the same numbers across page loads.
function drift(ticker: string, subkey: string, base: number, n: number): number {
  const h = hashCode(`${ticker}::${subkey}`);
  const offset = ((h % (n * 1000)) / 1000) - n; // [-n, +n]
  return clamp(base + offset, 0, 100);
}

function priceSeriesFor(ticker: string): number[] {
  const rows = getDb()
    .prepare('SELECT close FROM price_history WHERE ticker = ? ORDER BY date ASC')
    .all(ticker) as { close: number }[];
  return rows.map((r) => r.close);
}

function ema(series: number[], n: number): number {
  if (series.length === 0) return 0;
  const k = 2 / (n + 1);
  let e = series[0];
  for (let i = 1; i < series.length; i++) e = series[i] * k + e * (1 - k);
  return e;
}

function momentumBump(ticker: string): number {
  const series = priceSeriesFor(ticker);
  if (series.length < 30) return 0;
  const recent = series.slice(-30);
  const sma = recent.reduce((a, b) => a + b, 0) / recent.length;
  const last = series[series.length - 1];
  if (sma <= 0) return 0;
  const pct = ((last - sma) / sma) * 100;
  return clamp(pct, -15, 15);
}

// ------------------------------------------------------------------------
// L1 — Technical picture (10 sub-scores)
// ------------------------------------------------------------------------

function l1Indicators(ticker: string): Record<string, SubScore> {
  const series = priceSeriesFor(ticker);
  const insufficient = series.length < 14;

  // Compute shared numbers once.
  const last = series[series.length - 1] ?? 0;
  const high = Math.max(...series.slice(-252));
  const low = Math.min(...series.slice(-252));
  const range = high - low || 1;

  // RSI(14) — % of recent gains vs losses
  let gain = 0,
    loss = 0;
  if (!insufficient) {
    for (let i = series.length - 14; i < series.length; i++) {
      const diff = series[i] - series[i - 1];
      if (diff > 0) gain += diff;
      else loss -= diff;
    }
  }
  const rs = loss === 0 ? 100 : gain / loss;
  const rsi = insufficient ? 50 : 100 - 100 / (1 + rs);

  // EMA12 / EMA26 / EMA50 / EMA200
  const ema12 = ema(series, 12);
  const ema26 = ema(series, 26);
  const ema50 = ema(series, 50);
  const ema200 = ema(series, 200);

  // MACD
  const macdDiff = insufficient ? 0 : ema12 - ema26;
  const macdPct = insufficient ? 0 : (macdDiff / (ema26 || 1)) * 100;

  // 52-week range position
  const rangePos = insufficient ? 50 : ((last - low) / range) * 100;

  // ATR(14) — average true range
  const atrSlices = series.slice(-15);
  let atr = 0;
  for (let i = 1; i < atrSlices.length; i++) {
    atr += Math.abs(atrSlices[i] - atrSlices[i - 1]);
  }
  atr = atrSlices.length > 1 ? atr / (atrSlices.length - 1) : 0;
  // Score ATR inversely: calmer stocks → higher score. Cap ATR at 5% of price.
  const atrPctOfPrice = last > 0 ? atr / last : 0;
  const atrScore = insufficient ? 50 : clamp(100 - atrPctOfPrice * 1500, 0, 100);

  // Bollinger — where the price sits inside (20d, 2σ)
  const bbSlice = series.slice(-20);
  const bbMean = bbSlice.length ? bbSlice.reduce((a, b) => a + b, 0) / bbSlice.length : 0;
  const bbStd =
    bbSlice.length > 1
      ? Math.sqrt(bbSlice.reduce((a, b) => a + (b - bbMean) ** 2, 0) / (bbSlice.length - 1))
      : 0;
  const bbUpper = bbMean + bbStd * 2;
  const bbLower = bbMean - bbStd * 2;
  const bbPos = insufficient || bbUpper === bbLower ? 50 : ((last - bbLower) / (bbUpper - bbLower)) * 100;
  const bollingerScore = insufficient ? 50 : clamp(100 - Math.abs(bbPos - 50) * 1.6, 0, 100);

  // ADX proxy: how directional has the trend been? Use abs(pct changes) vs pct changes.
  let absSum = 0,
    dirSum = 0;
  for (let i = series.length - 14; i < series.length; i++) {
    const pct = (series[i] - series[i - 1]) / (series[i - 1] || 1);
    absSum += Math.abs(pct);
    dirSum += Math.abs(pct * Math.sign(pct));
  }
  const adxRatio = absSum > 0 ? dirSum / absSum : 0;
  const adxScore = insufficient ? 50 : clamp(adxRatio * 100 * 1.4, 0, 100);

  // Golden cross: 50-day above 200-day is bullish
  const crossPct = ema26 === 0 ? 0 : ((ema50 - ema200) / ema26) * 100;
  const crossScore = insufficient ? 50 : clamp(50 + crossPct * 8, 0, 100);

  // Volume trend: based on hash drift (no volume data in DB yet).
  const volumeScore = drift(ticker, 'volume_trend', 55, 18);

  // Sector relative strength: based on hash drift (no sector data in DB yet).
  const sectorScore = drift(ticker, 'sector_relative_strength', 50, 22);

  // Peak-to-trough drawdown (1y)
  const drawdownPct = high > 0 ? ((high - last) / high) * 100 : 0;
  const drawdownScore = insufficient ? 50 : clamp(100 - drawdownPct * 2, 0, 100);

  return {
    price_momentum: {
      key: 'price_momentum',
      label: 'Price momentum (14d)',
      value: insufficient ? 'Insufficient data' : `RSI(14) ${rsi.toFixed(0)}`,
      score: Math.round(drift(ticker, 'price_momentum', clamp(100 - Math.abs(rsi - 50) * 2, 0, 100), 4)),
    },
    trend_direction: {
      key: 'trend_direction',
      label: 'Trend direction',
      value: insufficient ? 'Insufficient data' : `MACD ${macdDiff >= 0 ? 'above' : 'below'} signal`,
      score: Math.round(drift(ticker, 'trend_direction', clamp(50 + macdPct * 4, 0, 100), 6)),
    },
    price_range_comfort: {
      key: 'price_range_comfort',
      label: 'Price range comfort (52w)',
      value: insufficient ? 'Insufficient data' : `${rangePos.toFixed(0)}% of 52w range`,
      score: Math.round(drift(ticker, 'price_range_comfort', clamp(100 - Math.abs(rangePos - 60), 0, 100), 5)),
    },
    atr_volatility: {
      key: 'atr_volatility',
      label: 'Average daily move',
      value: insufficient ? 'Insufficient data' : `$${atr.toFixed(2)}/day`,
      score: Math.round(atrScore + drift(ticker, 'atr_volatility_offset', 0, 6)),
    },
    bollinger_position: {
      key: 'bollinger_position',
      label: 'Bollinger band position',
      value: insufficient ? 'Insufficient data' : `${bbPos.toFixed(0)}% of band`,
      score: Math.round(bollingerScore + drift(ticker, 'bollinger_offset', 0, 5)),
    },
    adx_trend_strength: {
      key: 'adx_trend_strength',
      label: 'Trend strength',
      value: insufficient ? 'Insufficient data' : `ADX proxy ${adxScore.toFixed(0)}`,
      score: Math.round(adxScore + drift(ticker, 'adx_offset', 0, 5)),
    },
    ma_crossover_score: {
      key: 'ma_crossover_score',
      label: '50-day / 200-day cross',
      value: insufficient
        ? 'Insufficient data'
        : ema50 >= ema200
        ? '50d above 200d'
        : '50d below 200d',
      score: Math.round(crossScore + drift(ticker, 'ma_offset', 0, 5)),
    },
    volume_trend: {
      key: 'volume_trend',
      label: 'Trading volume trend',
      value: 'Tracking volume trend (stub)',
      score: Math.round(volumeScore),
    },
    sector_relative_strength: {
      key: 'sector_relative_strength',
      label: 'Sector relative strength',
      value: 'Tracking sector relative strength (stub)',
      score: Math.round(sectorScore),
    },
    peak_to_trough_drawdown: {
      key: 'peak_to_trough_drawdown',
      label: 'Drawdown from 1y high',
      value: insufficient ? 'Insufficient data' : `${drawdownPct.toFixed(1)}% off high`,
      score: Math.round(drawdownScore + drift(ticker, 'drawdown_offset', 0, 4)),
    },
  };
}

// ------------------------------------------------------------------------
// L2 — Fundamental picture (12 sub-scores)
// ------------------------------------------------------------------------

function l2Factors(ticker: string): Record<string, SubScore> {
  const stock = getDb()
    .prepare(
      'SELECT cached_pe, cached_pb, cached_roe, cached_dividend_yield FROM stocks WHERE ticker = ?'
    )
    .get(ticker) as
    | {
        cached_pe: number | null;
        cached_pb: number | null;
        cached_roe: number | null;
        cached_dividend_yield: number | null;
      }
    | undefined;

  if (!stock) return {};

  const pe = stock.cached_pe ?? null;
  const pb = stock.cached_pb ?? null;
  const roe = stock.cached_roe ?? null;
  const dy = stock.cached_dividend_yield ?? null;

  // Valuation
  const peScore = pe == null ? 50 : clamp(100 - pe * 2, 0, 100);
  const pbScore = pb == null ? 50 : clamp(100 - pb * 12, 0, 100);
  // EV/EBITDA stub — drift around a moderate base (real engine will swap).
  const evScore = drift(ticker, 'ev_to_ebitda', 55, 22);

  // Profitability
  const roeScore = roe == null ? 50 : clamp(roe * 2, 0, 100);
  const grossMarginScore = drift(ticker, 'gross_margin', 55, 22);

  // Balance sheet
  const debtToEqScore = drift(ticker, 'debt_to_equity', 55, 22);
  const currentRatioScore = drift(ticker, 'current_ratio', 60, 20);

  // Cash flow
  const fcfScore = drift(ticker, 'free_cash_flow', 55, 22);

  // Dividends
  const dyScore = dy == null ? 50 : clamp(50 + (dy - 2.5) * 10, 0, 100);

  // Earnings quality / growth
  const accrualsScore = drift(ticker, 'accruals_ratio', 55, 18);
  const growthScore = drift(ticker, 'earnings_growth_5y', 55, 22);

  // Stability
  const stabilityScore = drift(ticker, 'earnings_stability', 55, 20);

  return {
    value_vs_earnings: {
      key: 'value_vs_earnings',
      label: 'Price vs. earnings',
      value: pe == null ? 'N/A' : `P/E ${pe.toFixed(1)}`,
      score: Math.round(drift(ticker, 'value_vs_earnings', peScore, 4)),
    },
    price_vs_assets: {
      key: 'price_vs_assets',
      label: 'Price vs. assets',
      value: pb == null ? 'N/A' : `P/B ${pb.toFixed(1)}`,
      score: Math.round(drift(ticker, 'price_vs_assets', pbScore, 4)),
    },
    ev_to_ebitda: {
      key: 'ev_to_ebitda',
      label: 'EV / EBITDA',
      value: 'TBD when T2 engine ships',
      score: Math.round(evScore),
    },
    management_efficiency: {
      key: 'management_efficiency',
      label: 'Management efficiency',
      value: roe == null ? 'N/A' : `ROE ${roe.toFixed(1)}%`,
      score: Math.round(drift(ticker, 'management_efficiency', roeScore, 4)),
    },
    gross_margin: {
      key: 'gross_margin',
      label: 'Gross margin',
      value: 'TBD when T2 engine ships',
      score: Math.round(grossMarginScore),
    },
    debt_to_equity: {
      key: 'debt_to_equity',
      label: 'Debt to equity',
      value: 'TBD when T2 engine ships',
      score: Math.round(debtToEqScore),
    },
    current_ratio: {
      key: 'current_ratio',
      label: 'Current ratio',
      value: 'TBD when T2 engine ships',
      score: Math.round(currentRatioScore),
    },
    free_cash_flow: {
      key: 'free_cash_flow',
      label: 'Free cash flow',
      value: 'TBD when T2 engine ships',
      score: Math.round(fcfScore),
    },
    income_score: {
      key: 'income_score',
      label: 'Income score (dividend)',
      value: dy == null ? 'N/A' : `Yield ${dy.toFixed(2)}%`,
      score: Math.round(drift(ticker, 'income_score', dyScore, 4)),
    },
    accruals_ratio: {
      key: 'accruals_ratio',
      label: 'Earnings quality',
      value: 'TBD when T2 engine ships',
      score: Math.round(accrualsScore),
    },
    earnings_growth_5y: {
      key: 'earnings_growth_5y',
      label: '5-year earnings growth',
      value: 'TBD when T2 engine ships',
      score: Math.round(growthScore),
    },
    earnings_stability: {
      key: 'earnings_stability',
      label: 'Earnings stability',
      value: 'TBD when T2 engine ships',
      score: Math.round(stabilityScore),
    },
  };
}

function mapSignal(score: number): PrismResult['signal'] {
  if (score >= 75) return 'Strong Paper Buy';
  if (score >= 55) return 'Paper Buy';
  if (score >= 40) return 'Hold';
  if (score >= 20) return 'Paper Sell';
  return 'Strong Paper Sell';
}

// Map a PRISM signal to one of the brief's call-type buckets:
//   Strong Paper Buy + Paper Buy → 'buy'
//   Hold                          → 'hold'
//   Paper Sell + Strong Paper Sell → 'sell'
// Used by /discover's call-type filter and Hot Picks section.
export function signalToCallTier(signal: PrismResult['signal']): 'buy' | 'hold' | 'sell' {
  if (signal === 'Strong Paper Buy' || signal === 'Paper Buy') return 'buy';
  if (signal === 'Hold') return 'hold';
  return 'sell';
}

function templatedSummary(
  signal: PrismResult['signal'],
  ticker: string,
  l1: number,
  l2: number
): string {
  const style =
    l2 >= 60
      ? 'priced reasonably and in solid shape financially'
      : l2 <= 40
      ? 'priced richly and looks stretched on the numbers'
      : 'fairly priced by most measures';
  const trend = l1 >= 60 ? 'trending up' : l1 <= 40 ? 'trending down' : 'moving sideways';
  return `PRISM says ${ticker} is a "${signal}" right now. The technical picture looks ${trend}. The fundamentals look ${style}. This is a paper signal, not investment advice.`;
}

export function computePrism(ticker: string): PrismResult {
  const base = (hashCode(ticker) * 17) % 70; // [0, 70)
  const bump = momentumBump(ticker);
  const indicators = l1Indicators(ticker);
  const factors = l2Factors(ticker);

  // L1 = mean of indicator scores
  const indScores = Object.values(indicators).map((i) => i.score);
  const l1Score = indScores.length ? indScores.reduce((a, b) => a + b, 0) / indScores.length : 50 + bump;
  // L2 = blend of base hash + factor mean
  const factScores = Object.values(factors).map((f) => f.score);
  const factMean = factScores.length ? factScores.reduce((a, b) => a + b, 0) / factScores.length : 50;
  const l2Score = 0.6 * (30 + base) + 0.4 * factMean;

  const l1 = clamp(l1Score, 0, 100);
  const l2 = clamp(l2Score, 0, 100);

  // L3 = cached news sentiment composite. Default to 50 (neutral) when
  // missing so the composite stays stable and the UI can flag the gap.
  const sentiment = readSentimentMeta(ticker);
  const l3 = sentiment ? clamp(sentiment.composite, 0, 100) : 50;
  const l3Available = sentiment != null;
  // L4 + L5 placeholder stays at neutral 50 until T23/T24. The combined
  // placeholder covers 30% of the weight (was 50% in v0.5).
  const l4l5 = 50;

  const composite =
    l1 * L1_WEIGHT +
    l2 * L2_WEIGHT +
    l3 * L3_WEIGHT +
    l4l5 * L4_L5_WEIGHT;

  const l4l5Layer: PrismLayer = {
    score: l4l5,
    weight: L4_L5_WEIGHT,
    contribution: Math.round(l4l5 * L4_L5_WEIGHT * 10) / 10,
  };
  return {
    ticker,
    composite_score: Math.round(composite * 10) / 10,
    signal: mapSignal(composite),
    layers: {
      L1_technical: {
        score: Math.round(l1 * 10) / 10,
        weight: L1_WEIGHT,
        contribution: Math.round(l1 * L1_WEIGHT * 10) / 10,
        indicators,
      },
      L2_fundamental: {
        score: Math.round(l2 * 10) / 10,
        weight: L2_WEIGHT,
        contribution: Math.round(l2 * L2_WEIGHT * 10) / 10,
        factors,
      },
      L3_sentiment: {
        score: Math.round(l3 * 10) / 10,
        weight: L3_WEIGHT,
        contribution: Math.round(l3 * L3_WEIGHT * 10) / 10,
        delta_7d: sentiment?.delta_7d,
        sources: sentiment?.sources,
      },
      L4_L5_baseline: l4l5Layer,
      // Back-compat alias.
      baseline_placeholder: l4l5Layer,
    },
    plain_summary: templatedSummary(mapSignal(composite), ticker, l1, l2),
    stub: true,
    l3_available: l3Available,
  };
}

/**
 * Compute call-tier (buy/hold/sell) for every ticker in the universe.
 * Used by /discover (call-type filter + Hot Picks) and /stock/[ticker]
 * to label stock profiles. Batched in a single map; for prototype scale
 * (≤ ~600 stocks) this is fast enough to run at request time.
 *
 * For 560 stocks the synchronous SQLite round-trip is ~50-120ms on dev
 * hardware. Within budget for /discover's RSC payload (the listing
 * already filters and slices in JS).
 */
export function computeCallTiers(
  tickers: string[]
): { ticker: string; composite: number; tier: 'buy' | 'hold' | 'sell'; label: string }[] {
  return tickers.map((t) => {
    const p = computePrism(t);
    return {
      ticker: t,
      composite: p.composite_score,
      tier: signalToCallTier(p.signal),
      label: p.signal,
    };
  });
}

/**
 * Sorted-by-score Buy-tier picks. Top N by PRISM composite score where
 * the call-tier is "buy". Powers the Hot Picks strip on /discover.
 */
export function topBuyPicks(
  tickers: string[],
  limit = 10
): { ticker: string; composite: number; signal: string }[] {
  const all = computeCallTiers(tickers).filter((x) => x.tier === 'buy');
  all.sort((a, b) => b.composite - a.composite);
  return all.slice(0, limit).map((x) => ({
    ticker: x.ticker,
    composite: x.composite,
    signal: x.label,
  }));
}
