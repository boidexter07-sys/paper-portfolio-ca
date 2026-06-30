// Constants used across the prototype.

export const PRICE_HISTORY_LOOKBACK = 252; // ~1 trading year
export const TRIAL_DAYS = 7;
export const SUBSCRIPTION_PRICE_CAD = 4.99;

// T41: user-input starting cash for paper portfolios.
// Range is wide enough to feel like real paper-trading platforms
// (Investopedia $100K, MarketWatch Game $100K, TradingSim $5K–$1M)
// but bounded so the UI can use a sane slider.
export const MIN_PORTFOLIO_CASH_CAD = 50_000;
export const MAX_PORTFOLIO_CASH_CAD = 1_000_000;
export const DEFAULT_PORTFOLIO_CASH_CAD = 100_000;
export const CASH_STEP_CAD = 10_000;

// Server-side validator. Round to the nearest step so a user typing "100005"
// still gets a clean $100,000 (matches the slider's snapping behaviour) OR
// rejects the value outright — we choose REJECT here so the validation is
// strict and the API/UI agree on what "valid" means.
export function validateStartingCash(value: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'Starting cash must be a number.' };
  }
  if (n <= 0) {
    return { ok: false, error: 'Starting cash must be positive.' };
  }
  if (n < MIN_PORTFOLIO_CASH_CAD) {
    return { ok: false, error: `Starting cash must be at least $${MIN_PORTFOLIO_CASH_CAD.toLocaleString('en-CA')}.` };
  }
  if (n > MAX_PORTFOLIO_CASH_CAD) {
    return { ok: false, error: `Starting cash must be at most $${MAX_PORTFOLIO_CASH_CAD.toLocaleString('en-CA')}.` };
  }
  if (n % CASH_STEP_CAD !== 0) {
    return { ok: false, error: `Starting cash must be a multiple of $${CASH_STEP_CAD.toLocaleString('en-CA')}.` };
  }
  return { ok: true, value: n };
}

// Backwards-compat: existing callers that import the old name keep working.
export const STARTING_CASH_CAD = DEFAULT_PORTFOLIO_CASH_CAD;

// Re-export disclosure constants so account-page imports stay clean.
export { PIPEDA_NOTICE, TRIAL_DISCLOSURE } from './disclosures';