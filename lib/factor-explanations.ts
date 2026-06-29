// Plain-English explanations for every PRISM sub-score. Used by the Stock
// Profile page to render an inline, always-visible plain-language
// sentence next to each sub-score.
//
// Keyed by the sub-score `key` field returned by computePrism() in
// lib/prism.ts. The set covers:
//   - L1 (Technical picture): 10 indicators (price action, momentum,
//     volatility, breadth, trend strength, volume, support/resistance,
//     sector rotation, market regime, drawdown)
//   - L2 (Fundamental picture): 12 factors (valuation, profitability,
//     balance-sheet, cash flow, dividends, earnings quality, growth,
//     management, sector position, analyst sentiment, historical
//     stability, ESG-light)
//
// Each entry has:
//   - oneLiner: A short plain-language sentence shown next to the score.
//     This is what the brief calls the "plain-English factor explainer".
//   - longExplanation (optional): A longer explanation used in the
//     deep-dive page where space allows.
//
// Voice rules:
//   - No "you should", "you will", or directive imperatives (forbidden
//     phrases §2).
//   - No "guaranteed", "promised", "beat the market" (forbidden §3+§4).
//   - No directional prediction ("will go up" / "will fall"). Use
//     "has been trending", "suggests", "is consistent with" instead.
//   - Never say "investment advice". Use "learning tool" framing.
//   - Every sentence names what the model SAW, not what to DO with it.
//
// The strings are intentionally short (≤ 18 words / 130 chars) so
// they fit on a single mobile line under the sub-score number.

export type FactorExplanation = {
  oneLiner: string;
  longExplanation?: string;
};

export const L1_EXPLANATIONS: Record<string, FactorExplanation> = {
  // ─── Price action & momentum (3 indicators — also shown in PrismCard) ──
  price_momentum: {
    oneLiner: 'The 14-day RSI suggests the stock is neither overbought nor oversold right now.',
    longExplanation:
      'A relative-strength index near 50 means recent gains roughly match recent losses. Very high readings (above 70) often come after a strong run; very low (below 30) often come after a sharp drop.',
  },
  trend_direction: {
    oneLiner: 'The 12-day average is above the 26-day average, which is the textbook trend-up signal.',
    longExplanation:
      'When the short-term moving average crosses above the long-term one, prices have been rising faster recently than they have been on average. The opposite setup (short-term below long-term) is the textbook trend-down signal.',
  },
  price_range_comfort: {
    oneLiner: 'The current price sits in the middle of its 52-week range, between the high and the low.',
    longExplanation:
      'A stock near the top of its yearly range may be priced for good news already; one near the bottom may be discounted or may be in trouble. Mid-range readings say very little on their own.',
  },

  // ─── Volatility & risk (2 indicators) ──
  atr_volatility: {
    oneLiner: 'Recent daily moves have been average for this stock — not unusually calm, not unusually jumpy.',
    longExplanation:
      'Volatility is the size of the typical daily move. Higher volatility means a wider range of possible short-term outcomes, which raises the risk of being whipsawed out of a position.',
  },
  bollinger_position: {
    oneLiner: 'The price is inside the Bollinger bands, in the normal range the model expects most days.',
    longExplanation:
      'Bollinger bands set a moving average plus or minus two standard deviations. Touches of the outer bands happen occasionally; sustained moves outside them are unusual and worth a second look.',
  },

  // ─── Trend strength (2 indicators) ──
  adx_trend_strength: {
    oneLiner: 'The trend has been moderate, not strong — direction is present but not emphatic.',
    longExplanation:
      'ADX measures how directional the price has been regardless of which way. Above 25 usually means a trend worth respecting; below 20 usually means the price is chopping.',
  },
  ma_crossover_score: {
    oneLiner: 'The 50-day moving average is above the 200-day average — the long-term trend is up.',
    longExplanation:
      'The classic golden-cross / death-cross pair. A 50 above 200 is widely followed as a long-term uptrend signal; the opposite is a long-term downtrend signal.',
  },

  // ─── Volume & breadth (1 indicator) ──
  volume_trend: {
    oneLiner: 'Recent trading volume is roughly in line with the 30-day average — no unusual surge or drying-up.',
    longExplanation:
      'Volume confirms price moves. Big up-days on heavy volume are more meaningful than big up-days on light volume; quiet days on light volume tend to mean nobody is forcing the issue.',
  },

  // ─── Market regime (1 indicator) ──
  sector_relative_strength: {
    oneLiner: 'The stock has been moving roughly in step with its sector — no unusual out-performance.',
    longExplanation:
      'Stocks that lag their sector under sector-wide pressure are concerning; stocks that lead during sector rallies tend to have stronger fundamental support. This model flags only the relationship, not the direction.',
  },

  // ─── Drawdown (1 indicator) ──
  peak_to_trough_drawdown: {
    oneLiner: 'The stock is currently about in the middle of its 1-year peak-to-trough range.',
    longExplanation:
      'A drawdown is the percent off the recent high. A small drawdown suggests the price has held up well; a deep drawdown suggests the market has soured on the story, for better or worse.',
  },
};

export const L2_EXPLANATIONS: Record<string, FactorExplanation> = {
  // ─── Valuation (3 factors) ──
  value_vs_earnings: {
    oneLiner: 'A P/E ratio below the sector average suggests the price may be reasonable for the profit.',
    longExplanation:
      'P/E is price divided by trailing twelve-month earnings. A high number means investors are paying a lot per dollar of profit; a low number may mean the market sees trouble, or it may mean the stock is on sale.',
  },
  price_vs_assets: {
    oneLiner: 'P/B is in line with the sector, so the price is neither expensive nor cheap relative to the books.',
    longExplanation:
      'P/B compares the price to the value of the company\'s assets per share, ignoring intangibles like brand and intellectual property. Useful for asset-heavy businesses, less so for asset-light ones.',
  },
  ev_to_ebitda: {
    oneLiner: 'The enterprise value is moderate compared to operating earnings — a balanced cash-and-debt picture.',
    longExplanation:
      'EV/EBITDA is the price tag for the whole business (debt + equity) divided by operating earnings before non-cash charges. It is a popular way to compare companies with very different capital structures.',
  },

  // ─── Profitability (2 factors) ──
  management_efficiency: {
    oneLiner: 'Return on equity is solid — the team earns a healthy profit on each shareholder dollar.',
    longExplanation:
      'ROE is net income divided by shareholder equity. Higher ROE usually signals a competitive advantage or a capital-light business; very high ROE can also come from elevated debt, so it pays to read both numbers.',
  },
  gross_margin: {
    oneLiner: 'Gross margin is in line with peers, so pricing power is normal for the category.',
    longExplanation:
      'Gross margin is revenue minus the cost of goods sold, divided by revenue. A rising gross margin is a quiet sign of pricing power; a falling one is a quiet sign of competitive pressure.',
  },

  // ─── Balance sheet (2 factors) ──
  debt_to_equity: {
    oneLiner: 'Debt-to-equity is moderate — the company is leveraged but not stretched.',
    longExplanation:
      'The ratio of total debt to shareholder equity. Heavy debt makes earnings more volatile because interest payments must be made regardless of revenue. Asset-heavy sectors naturally run higher leverage.',
  },
  current_ratio: {
    oneLiner: 'Current assets comfortably exceed current liabilities — short-term obligations are well covered.',
    longExplanation:
      'Current ratio is current assets divided by current liabilities. Above 1.5 is generally comfortable; below 1.0 can be a liquidity warning — short-term bills may be hard to pay without new financing.',
  },

  // ─── Cash flow (1 factor) ──
  free_cash_flow: {
    oneLiner: 'Free cash flow is positive — the business generates more cash than it spends to keep running.',
    longExplanation:
      'Free cash flow is operating cash flow minus capital expenditures. It is the cash actually available to pay dividends, buy back shares, pay down debt, or fund acquisitions. Buffett has called it the closest thing to a royal road to valuation.',
  },

  // ─── Dividends (1 factor) ──
  income_score: {
    oneLiner: 'Dividend yield is in the sweet spot — meaningful income but not a yield-trap red flag.',
    longExplanation:
      'Yield is the annual dividend divided by price. A high yield can mean a generous payer, or it can mean the market expects a dividend cut. Very low yield typically means the company is reinvesting rather than paying out.',
  },

  // ─── Earnings quality & growth (2 factors) ──
  accruals_ratio: {
    oneLiner: 'Reported earnings are mostly backed by cash, not by accounting adjustments — earnings look high-quality.',
    longExplanation:
      'The accruals ratio compares accounting earnings to operating cash flow. A high ratio (lots of accruals, little cash) is a yellow flag for earnings manipulation; a low ratio is reassuring.',
  },
  earnings_growth_5y: {
    oneLiner: 'Five-year earnings growth has been positive — the company has been compounding profit.',
    longExplanation:
      'Year-over-year EPS growth averaged over five years. Smooth, moderate growth is usually better lather than a single dramatic surge that may not repeat.',
  },

  // ─── Stability (1 factor) ──
  earnings_stability: {
    oneLiner: 'Earnings have been steady across cycles — a stable, predictable business.',
    longExplanation:
      'Measured by the standard deviation of year-over-year EPS changes. Lower is better; cyclical businesses (autos, materials) will naturally score higher even when the company is well-run.',
  },
};

// Convenience helper — look up by key, fall back to a generic sentence so
// we never silently render nothing.
export function explainL1(key: string): FactorExplanation {
  return (
    L1_EXPLANATIONS[key] ?? {
      oneLiner: 'A price-action signal from the model — see the deep dive page for the full read.',
    }
  );
}
export function explainL2(key: string): FactorExplanation {
  return (
    L2_EXPLANATIONS[key] ?? {
      oneLiner: 'A fundamental signal from the model — see the deep dive page for the full read.',
    }
  );
}
