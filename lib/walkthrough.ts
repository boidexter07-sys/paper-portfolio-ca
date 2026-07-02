// Altier Edge — 8-step guided tour.
// Locked from copy/muse-guided-tour.md.
// Steps: Account setup → Run PRISM → Watchlist → Enter challenge →
// See leaderboard → Claim merch → Find Learn → Follow a clan.

export const WALKTHROUGH_STEPS = [
  {
    key: 'account-setup',
    title: 'Set up your account',
    body:
      'Pick a username, set your timezone to Eastern Time, and choose which account types you want to track (RRSP, TFSA, taxable).',
    target: '[data-walk-target="account-menu"]',
    illustration: 'account-setup',
    nextLabel: 'Next',
    action: 'next' as const,
  },
  {
    key: 'run-prism',
    title: 'Run PRISM on a stock',
    body:
      'Type a ticker you know. PRISM scores every stock 0 to 100. Tap the score to see the five-layer breakdown.',
    target: '[data-walk-target="discover-link"]',
    illustration: 'run-prism',
    nextLabel: 'Try it',
    action: 'try' as const,
  },
  {
    key: 'watchlist',
    title: 'Add to your watchlist',
    body:
      'The watchlist keeps the tickers you want to follow on one screen. Add as many as you want. The list stays between sessions.',
    target: '[data-walk-target="watchlist-cta"]',
    illustration: 'watchlist',
    nextLabel: 'Try it',
    action: 'try' as const,
  },
  {
    key: 'enter-challenge',
    title: 'Enter your first challenge',
    body:
      'Pick a Rookie-tier challenge. Stake a small amount of credits. The window is 1–3 days. The leaderboard settles on real prices at the close.',
    target: '[data-walk-target="arena-cta"]',
    illustration: 'enter-challenge',
    nextLabel: 'Next',
    action: 'next' as const,
    disclosure: '[ Paper-trading only · credits, not cash ]',
  },
  {
    key: 'leaderboard',
    title: 'See the live leaderboard',
    body:
      'Leaderboards settle once a day at 4:30 p.m. ET. Refresh is a re-rank, not a tick. The IDs are anonymized.',
    target: '[data-walk-target="leaderboard-link"]',
    illustration: 'leaderboard',
    nextLabel: 'Next',
    action: 'next' as const,
    disclosure: '[ Refresh is a re-rank, not a tick · settlement at 4:30 p.m. ET ]',
  },
  {
    key: 'claim-merch',
    title: 'Claim your merch credits',
    body:
      'Credits earned inside the app can be spent on merch from the catalog. The catalog rotates seasonally. Merch ships to your address on file.',
    target: '[data-walk-target="rewards-cta"]',
    illustration: 'claim-merch',
    nextLabel: 'Try it',
    action: 'try' as const,
    disclosure: '[ Merch rewards are not transferable for cash ]',
  },
  {
    key: 'find-learn',
    title: 'Read your first Learn article',
    body:
      'Learn is the in-app library. Six articles ship on day one. The first article is "What is a stock, really?" — 5 minutes, no jargon.',
    target: '[data-walk-target="learn-link"]',
    illustration: 'find-learn',
    nextLabel: 'Try it',
    action: 'try' as const,
  },
  {
    key: 'follow-clan',
    title: 'Follow a small clan',
    body:
      'Clans are small groups of 3–10 who run paper-trading contests together. Follow one to see how group challenges settle. You can leave any clan from Settings.',
    target: '[data-walk-target="clan-join"]',
    illustration: 'follow-clan',
    nextLabel: 'Finish tour',
    action: 'finish' as const,
  },
] as const;

export type WalkthroughStep = (typeof WALKTHROUGH_STEPS)[number];

export function getWalkthroughStep(key: string): WalkthroughStep | null {
  return WALKTHROUGH_STEPS.find((s) => s.key === key) ?? null;
}

export function getWalkthroughIndex(key: string): number {
  return WALKTHROUGH_STEPS.findIndex((s) => s.key === key);
}

export function nextStepKey(key: string): string | null {
  const i = getWalkthroughIndex(key);
  if (i < 0 || i >= WALKTHROUGH_STEPS.length - 1) return null;
  return WALKTHROUGH_STEPS[i + 1].key;
}

export function prevStepKey(key: string): string | null {
  const i = getWalkthroughIndex(key);
  if (i <= 0) return null;
  return WALKTHROUGH_STEPS[i - 1].key;
}

/**
 * True if the user has never finished the walkthrough (NULL timestamp).
 * Pure helper — safe to import from anywhere.
 */
export function isWalkthroughPending(user: { walkthrough_completed_at: number | null }): boolean {
  return user.walkthrough_completed_at == null;
}