// T43: ARENA How-To-Play walkthrough — client-safe data + helpers.
//
// This module exports only plain data and pure helpers. The server-only
// DB-touching functions (markWalkthroughComplete / resetWalkthrough)
// live in lib/walkthrough.server.ts so they never get bundled into
// client code (which would drag better-sqlite3 + node:fs into the
// browser chunk).
//
// Step keys are stable; never renumber — the per-step URLs are
// /walkthrough/<key>. Renumbering would break bookmarks.

export const WALKTHROUGH_STEPS = [
  {
    key: 'welcome',
    title: 'Welcome to the arena',
    body:
      'This is a paper-trading learning tool. No real money moves — every signal and trade is a chance to practice reading stocks without risk. Take five minutes to see how it works.',
    target: null as string | null,
    illustration: 'welcome',
    nextLabel: "Let's go",
  },
  {
    key: 'pick-challenge',
    title: 'Pick your first challenge',
    body:
      'Challenges are small, concrete goals — predict a price target, beat a benchmark, time an earnings release. Browse the challenge list, read the rules, and pick one that lines up with your style.',
    target: '[data-walk-target="discover-link"]',
    illustration: 'pick-challenge',
    nextLabel: 'Next',
  },
  {
    key: 'build-portfolio',
    title: 'Build your challenge portfolio',
    body:
      'A challenge portfolio is a separate sandbox per challenge — so a risky bet on one stock can’t bleed into the rest of your paper trading. Open the challenge detail page and follow its setup steps.',
    target: '[data-walk-target="portfolio-link"]',
    illustration: 'build-portfolio',
    nextLabel: 'Next',
  },
  {
    key: 'submit-track',
    title: 'Submit and track',
    body:
      'Submit your entry when you’re ready. From there the challenge ledger tracks progress in plain language — what’s working, what isn’t, and what the room is doing.',
    target: '[data-walk-target="leaderboard-link"]',
    illustration: 'submit-track',
    nextLabel: 'Next',
  },
  {
    key: 'earn-credits',
    title: 'Earn credits',
    body:
      'Winning challenges pays out credits — like coins at an arcade. Credits are paper too, but they unlock the merch wall: t-shirts, mugs, and the limited seasonal drops.',
    target: null as string | null,
    illustration: 'earn-credits',
    nextLabel: 'Next',
  },
  {
    key: 'spend-merch',
    title: 'Spend on merch',
    body:
      'Open the merch wall, browse what’s in stock, and cash in your credits. Shipping is paper-only too, so the whole loop stays risk-free.',
    target: '[data-walk-target="credits-link"]',
    illustration: 'spend-merch',
    nextLabel: 'Finish',
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
