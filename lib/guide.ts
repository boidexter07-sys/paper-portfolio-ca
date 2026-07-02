// T67: Altier Edge — User Guide content for the 7 guide pages.
// Locked from copy/muse-user-guide-slugs.md.
// Plain prose, D2 mono treatment, disclosure strings pulled from disclosures.ts.

export type GuideSlug =
  | 'getting-started'
  | 'challenges'
  | 'clans'
  | 'leaderboards'
  | 'credits-merch'
  | 'community'
  | 'learn';

export interface GuideMeta {
  slug: GuideSlug;
  title: string;
  /** Short subtitle shown in the guide index card. */
  blurb: string;
  /** Lead paragraph at the top of the individual guide page. */
  intro: string;
  /** Approx reading time, minutes. */
  readingMinutes: number;
  /** Stable visual cue — see GuideCardIcon.tsx. */
  iconKey: 'compass' | 'puzzle' | 'flag' | 'chart' | 'coin' | 'chat' | 'book';
  /** Body sections (heading + plain copy). */
  body: { heading: string; copy: string }[];
  /** Optional footer disclosure (verbatim from disclosures.ts). */
  footer?: string;
}

export const GUIDES: GuideMeta[] = [
  {
    slug: 'getting-started',
    title: 'Getting started with Altier Edge',
    blurb: 'Five minutes from sign-up to your first paper trade.',
    intro:
      'Welcome. This page walks through the first ten minutes on the product. Most users finish the setup in under five minutes. None of it requires a credit card to start.',
    readingMinutes: 5,
    iconKey: 'compass',
    body: [
      {
        heading: 'The first thing to do',
        copy:
          'The first thing to do is open the account. From any page on the marketing site, click [ START FREE TRIAL ]. You will land on the sign-up form. Email and a password is enough to start. There is no card field on this form. The product is intentionally conservative at signup — collect the minimum to start, ask for the rest later.',
      },
      {
        heading: 'Set your timezone',
        copy:
          'The next thing to do is pick a timezone. Eastern Time is the default for Canada. If you are in another zone and want daily summaries to land at a specific local time, you can set it in Settings → Account.',
      },
      {
        heading: 'Run PRISM on a stock you know',
        copy:
          'The third thing to do is run PRISM on a stock you know. Type a ticker in the search bar at the top of any page. Tap the result. PRISM scores every stock 0 to 100. The score is on the right of the stock detail page; the five-layer breakdown is below it.',
      },
      {
        heading: 'Build a watchlist',
        copy:
          'The fourth thing to do is add a few tickers to your watchlist. The watchlist is the screen you will open most. Add whatever you want to follow. The list is private to you.',
      },
      {
        heading: 'From here',
        copy:
          'That is the setup. From here you can enter a Rookie-tier challenge (ARENA → Live), read your first Learn article (Learn → What is a stock, really?), or open a clan card to see how group challenges settle (Community → Clans). The guided tour replays the same flow as a walkthrough. To restart it, go to Help → Restart tour.',
      },
      {
        heading: 'Trial terms',
        copy:
          'The seven-day free trial starts at account creation. The trial ends on day 7 unless you stay. We do not auto-charge before day 8.',
      },
    ],
    footer: '[ Altier Edge · July 2026 ]',
  },
  {
    slug: 'challenges',
    title: 'Challenges, end to end',
    blurb: 'Pick a challenge, stake credits, climb the leaderboard.',
    intro:
      'A challenge is a paper-trading contest with a published scoring rule and a fixed window. This page is the short version.',
    readingMinutes: 6,
    iconKey: 'puzzle',
    body: [
      {
        heading: 'Pick a challenge',
        copy:
          'Open ARENA → Live. You will see between 1 and 7 challenges live at any moment. Each card carries a name, a tier (Rookie / Pro / Elite), a duration, a stake, and a payout. Pick the one that fits your read of the week.',
      },
      {
        heading: 'Stake your credits',
        copy:
          'Tap the card. Confirm the stake. Your credits are held from the moment the challenge starts, not before.',
      },
      {
        heading: 'Watch the leaderboard',
        copy:
          'Your challenge goes live. The board settles once a day at 4:30 p.m. ET. Refresh is a re-rank, not a tick. When the window closes, the top tier of the board gets the merch and the credit prize. Everyone else walks away with the score, the lesson, and the credits they did not lose.',
      },
      {
        heading: 'Three tiers',
        copy:
          'Rookie is the entry point. Shorter windows. A simple scoring metric. Pro is for the user with three or more completed challenges. Wider signal set. Elite is the widest surface area. Longest windows.',
      },
      {
        heading: 'Win framing',
        copy:
          'Win framing is "Stake X / Win up to Y". We do not show probability or expected value on the card. The math is on the methodology page. The on-the-card line is a stake and a payout.',
      },
      {
        heading: 'Leaving a challenge',
        copy:
          'If you want to leave a challenge before it opens, you can. From the challenge detail page, tap Leave challenge. Your credits return in full. Once the challenge starts, the stake is held. No refunds after the start.',
      },
    ],
    footer: '[ Altier Edge · July 2026 · Credits are earned inside the app. Not purchased. Cash out not available. · Merch rewards are not transferable for cash. ]',
  },
  {
    slug: 'clans',
    title: 'Clans, end to end',
    blurb: 'A small group of 3 to 10 who run paper-trading contests together.',
    intro:
      'A clan is a small group of 3 to 10 users who run paper-trading contests together. This page is the short version.',
    readingMinutes: 4,
    iconKey: 'flag',
    body: [
      {
        heading: 'Start a clan',
        copy:
          'Open Community → Create clan. Pick a name and a one-line description. Pick the size (3 to 10). The clan is yours to run. You can invite users by username from the clan page.',
      },
      {
        heading: 'Join a clan',
        copy:
          'Open Community → Clans. Tap a clan card. Tap Join. The clan owner approves your join. You are in.',
      },
      {
        heading: 'Run group challenges',
        copy:
          'Inside the clan, open Challenges. Pick a group challenge type. The group\'s average is the score. The math underneath is the same PRISM delta the solo challenges run; only the aggregation changes.',
      },
      {
        heading: 'Leave a clan',
        copy:
          'Open Settings → Clans. Tap Leave. Your running challenges inside the clan continue to settle on the schedule they were entered with. You are not removed from the leaderboard retroactively.',
      },
      {
        heading: 'Group final',
        copy:
          'At the end of a group cycle, the top groups from the prior rounds play off in a Group Final. The format is the same as a regular group challenge: scoring rule published, settlement once a day, top tier wins.',
      },
      {
        heading: 'Threads (optional)',
        copy:
          'Clans are not chat groups. They are paper-trading groups. If you want to talk to clan members outside the leaderboard, the clan page has a link to a private thread. The thread is optional. The leaderboard is the clan.',
      },
    ],
    footer: '[ Altier Edge · July 2026 ]',
  },
  {
    slug: 'leaderboards',
    title: 'Leaderboards, end to end',
    blurb: 'Settled once a day at 4:30 p.m. ET, anonymized, no live ticker.',
    intro:
      'Every ARENA challenge has a leaderboard. The leaderboard settles once a day at 4:30 p.m. ET. This page is the short version.',
    readingMinutes: 4,
    iconKey: 'chart',
    body: [
      {
        heading: 'The five columns',
        copy:
          'Rank. 01 to 05 (or however many ran the challenge). Anon ID. Anonymized. Each user gets a stable identifier (an opaque code, not a name). PRISM delta. The change in PRISM score during the window. Orange for positive, ink for negative. P&L. The percentage change in the position\'s value during the window. Settled on real prices. Hold weeks. How long the entry-side position was held before the window closed.',
      },
      {
        heading: 'Settlement',
        copy:
          'Daily summary fires at 4:30 p.m. ET. Refresh on the dashboard is a re-rank, not a tick. There is no live ticker. The leaderboard tells the truth about the window, and the window is over when it closes.',
      },
      {
        heading: 'Where to find a leaderboard',
        copy:
          'ARENA → Leaderboard — the overall ranking across all open and recently closed challenges. A specific challenge detail page — the leaderboard for that challenge only. A clan page — the leaderboard for the running group challenges inside that clan.',
      },
      {
        heading: 'Anonymized, disclosed',
        copy:
          'The IDs on every leaderboard are anonymized. The math is on the surface. The disclosure line [ Paper-trading only · credits, not cash · PRISM is a signal, not advice ] ships at the foot of every leaderboard.',
      },
    ],
    footer: '[ Altier Edge · July 2026 ]',
  },
  {
    slug: 'credits-merch',
    title: 'Credits and merch, end to end',
    blurb: 'Earn credits. Spend on merch. Neither is cash.',
    intro:
      'Credits and merch are the two rewards inside ARENA. Both are real. Neither is cash.',
    readingMinutes: 3,
    iconKey: 'coin',
    body: [
      {
        heading: 'How credits are earned',
        copy:
          'Daily login (small daily credit). Completing a Learn article. Finishing a challenge in the prize tier. Referring a friend who joins and stays. You spend credits to enter a challenge. You win credits when your challenge finishes in the prize tier. You cannot buy credits with cash. There is no top-up button. There is no in-app store for credits. There is no cash out.',
      },
      {
        heading: 'Merch — the prize wall',
        copy:
          'Merch is the reward at the top of every leaderboard. The catalog is inside the product. Categories rotate seasonally. The merch is shipped to your address on file.',
      },
      {
        heading: 'How to spend credits on merch',
        copy:
          'Open Rewards → Catalog. Pick an item. Confirm the credit cost. The cost is on each card. Confirm the shipping address. The address on the order must match the address on your account. The item ships in 5 to 10 business days.',
      },
      {
        heading: 'No cash conversion',
        copy:
          'Merch rewards are not transferable for cash. Credits earned in the app are not transferable for cash. There is no exchange rate between credits and any fiat currency. Conversion math — how many credits go to what merch item — lives on the catalog page inside the product. The math is published before you spend.',
      },
    ],
    footer: '[ Altier Edge · July 2026 · Credits are earned inside the app. Not purchased. Cash out not available. · Merch rewards are not transferable for cash. ]',
  },
  {
    slug: 'community',
    title: 'Community, end to end',
    blurb: 'Clans and group challenges. No streaks, no counter, no "you should join" prompt.',
    intro:
      'The Community page is where clans and group challenges live. Three sections, in this order.',
    readingMinutes: 5,
    iconKey: 'chat',
    body: [
      {
        heading: 'Featured clans',
        copy:
          'A small curated row of clans that have been active in the last 30 days. The curation is automatic: the row rotates weekly. There is no pay-to-play in the curation.',
      },
      {
        heading: 'Open group challenges',
        copy:
          'A list of group challenges that are open for entry right now. Each challenge carries the same fields as a solo challenge (name, duration, stake, payout), plus the group size.',
      },
      {
        heading: 'Your clans',
        copy:
          'If you are in any clans, they appear at the top of the page. Each clan card shows the running group challenges and a link to the clan page.',
      },
      {
        heading: 'Search and order',
        copy:
          'The page has a search field at the top. Search by clan name, by ticker the clan is interested in, or by group size. There is no algorithm-driven feed. The order of the results is alphabetical, then by size.',
      },
      {
        heading: 'Threads (opt-in)',
        copy:
          'Threads live on individual clan pages. A thread is optional. A clan without a thread still runs group challenges. Threads are opt-in for clan members.',
      },
      {
        heading: 'No streak counter',
        copy:
          'The Community page does not have a counter, a streak, or a "you should join" prompt. Joining a clan is a deliberate move.',
      },
    ],
    footer: '[ Altier Edge · July 2026 ]',
  },
  {
    slug: 'learn',
    title: 'Learn, end to end',
    blurb: 'Six articles on day one. Plain English. Patient teacher voice.',
    intro:
      'Learn is the in-app library. The library ships with six articles on day one. New articles ship every two weeks. The same author writes the library. The voice is consistent.',
    readingMinutes: 7,
    iconKey: 'book',
    body: [
      {
        heading: 'The six articles on day one',
        copy:
          'What is a stock, really? Reading a balance sheet. PRISM in 5 minutes. How compounding works. Why your gut isn\'t a strategy. The first 10 trades you should paper-trade.',
      },
      {
        heading: 'Format',
        copy:
          'Each article is 5 to 8 minutes long. Each ends with a step the reader can take inside the product (#### What you can do next). Reading one counts as a credit-earning event.',
      },
      {
        heading: 'Search and order',
        copy:
          'The library is searchable. The search field at the top of the page matches article titles and tags. There is no "for you" feed. The order of the results is most-recent first, then alphabetical.',
      },
      {
        heading: 'Reading counter',
        copy:
          'A reading-streak counter lives at the top of the page, showing consecutive days read — not as a gamification mechanic, but as a count. Reading is the goal. The counter is the side effect. The counter is in plain text, not in colored badges.',
      },
      {
        heading: 'Sources',
        copy:
          'Articles cite their sources inline where the source is a number. The methodology doc is the source for PRISM. The math runs the same way in every article.',
      },
    ],
    footer: '[ Altier Edge · July 2026 ]',
  },
];

export function findGuide(slug: string): GuideMeta | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

/** Five-step "Get started in 5 minutes" visual flow on /guide. */
export const QUICK_START_STEPS = [
  { n: 1, label: 'Open your account', target: '/guide/getting-started', body: 'Email + password. No card to start. 7-day trial.' },
  { n: 2, label: 'Set your timezone', target: '/guide/getting-started', body: 'Eastern Time is the default for Canada.' },
  { n: 3, label: 'Run PRISM on a stock', target: '/discover', body: 'Type a ticker. Tap. Read the five layers.' },
  { n: 4, label: 'Build a watchlist', target: '/discover', body: 'Add as many as you want. The list is private to you.' },
  { n: 5, label: 'Enter a Rookie challenge', target: '/arena', body: 'Stake credits. Watch the leaderboard update daily.' },
];