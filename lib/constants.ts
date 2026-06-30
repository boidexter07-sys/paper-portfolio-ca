// Constants used across the prototype.

export const PRICE_HISTORY_LOOKBACK = 252; // ~1 trading year
export const TRIAL_DAYS = 7;
export const SUBSCRIPTION_PRICE_CAD = 4.99;

// T40: starting paper-money cash every new portfolio begins with.
// $100,000 CAD — the industry-standard default for paper-trading
// platforms (Investopedia Stock Simulator, MarketWatch Game, etc.).
// Change this constant to retune the starting capital; existing rows
// are unaffected (backfill is a one-shot seed step).
export const STARTING_CASH_CAD = 100_000;

// Re-export disclosure constants so account-page imports stay clean.
export { PIPEDA_NOTICE, TRIAL_DISCLOSURE } from './disclosures';
