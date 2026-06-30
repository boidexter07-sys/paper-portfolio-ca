// T43: ARENA User Guide — content & metadata for the 7 guide pages.
//
// `slug` values must match the second segment of the URL:
//   /guide/[slug]. Renaming a slug is a 404 for any inbound link.
// `iconKey` is a static SVG id (see components/Guide/GuideCard.tsx) so
// we don't have to ship an icon library for the prototype.
//
// Copy placeholders use {{...}} markers — Muse fills these in the
// parallel T43-Muse task. The page renders fine without them; users
// see "Lorem-style placeholder text" until the markers are swapped.

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
  /** Longer lead paragraph at the top of the individual guide page. */
  intro: string;
  /** Approx reading time, minutes. Cosmetic; helps with the "Get started
   *  in 5 minutes" framing on the index. */
  readingMinutes: number;
  /** Stable visual cue — see GuideCardIcon.tsx. */
  iconKey: 'compass' | 'puzzle' | 'flag' | 'chart' | 'coin' | 'chat' | 'book';
  /** Two body paragraphs for the deep page. Placeholders for Muse. */
  body: { heading: string; copy: string }[];
}

export const GUIDES: GuideMeta[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    blurb: 'Five minutes from sign-up to your first paper trade.',
    intro:
      'A short tour of the parts you’ll touch most often: the home dashboard, the discover screen, the portfolio card, and the First Signal modal that explains how Plain Score works.',
    readingMinutes: 5,
    iconKey: 'compass',
    body: [
      {
        heading: 'The home dashboard',
        copy:
          '{{getting_started_home_dashboard_paragraph_1}} Two or three numbers tell the story of your paper portfolio at a glance, and below them the page surfaces the stock signals and community moves that matter right now. {{getting_started_home_dashboard_paragraph_2}}',
      },
      {
        heading: 'Your first paper trade',
        copy:
          '{{getting_started_first_trade_paragraph_1}} Open Discover, pick a stock, and tap Buy on its profile page — quantity defaults to one share and the cash balance updates instantly. {{getting_started_first_trade_paragraph_2}}',
      },
    ],
  },
  {
    slug: 'challenges',
    title: 'Challenges',
    blurb: 'Concrete goals you can enter in a minute and track forever.',
    intro:
      'Challenges are short-form prediction games with clear rules. Each one lives in its own portfolio so a wild bet can’t leak into the rest of your paper trading.',
    readingMinutes: 6,
    iconKey: 'puzzle',
    body: [
      {
        heading: 'How a challenge works',
        copy:
          '{{challenges_how_it_works_paragraph_1}} The ledger lists every active challenge — each with its entry rule, scoring rule, and payout. Most close in a week or two; some run a single trading day. {{challenges_how_it_works_paragraph_2}}',
      },
      {
        heading: 'Reading the rules',
        copy:
          '{{challenges_reading_rules_paragraph_1}} If the rules feel unclear, open the community thread linked from the challenge page — other learners will have asked the same questions. {{challenges_reading_rules_paragraph_2}}',
      },
    ],
  },
  {
    slug: 'clans',
    title: 'Clans',
    blurb: 'A small group you can run alongside. Optional, but fun.',
    intro:
      'Clans are lightweight teams. You can join one or start your own, share picks with the members, and watch your clan’s combined leaderboard rank move over the week.',
    readingMinutes: 4,
    iconKey: 'flag',
    body: [
      {
        heading: 'Joining and creating',
        copy:
          '{{clans_joining_creating_paragraph_1}} Browse open clans from the Community section — most are themed around an investing style (Value, Growth, Income). {{clans_joining_creating_paragraph_2}}',
      },
      {
        heading: 'Sharing picks privately',
        copy:
          '{{clans_sharing_picks_paragraph_1}} Clan-only threads are visible to members and never show up in the public community feed. {{clans_sharing_picks_paragraph_2}}',
      },
    ],
  },
  {
    slug: 'leaderboards',
    title: 'Leaderboards',
    blurb: 'Where you sit this week, with people who play the same way.',
    intro:
      'Leaderboards rank you against other learners on three axes: challenge wins, total paper P&L, and consistency over the last 30 days. Filter by clan or investing style for a fairer view.',
    readingMinutes: 4,
    iconKey: 'chart',
    body: [
      {
        heading: 'Three boards, three meanings',
        copy:
          '{{leaderboards_three_boards_paragraph_1}} Challenge wins rewards prediction skill; total P&L rewards portfolio skill; consistency rewards habits. {{leaderboards_three_boards_paragraph_2}}',
      },
      {
        heading: 'Filtering for fairness',
        copy:
          '{{leaderboards_filtering_paragraph_1}} When your investing style is Growth, the Growth-only board is the one to watch — the all-styles board tends to favour slower strategies. {{leaderboards_filtering_paragraph_2}}',
      },
    ],
  },
  {
    slug: 'credits-merch',
    title: 'Credits & merch',
    blurb: 'Earn credits by winning, spend them on the merch wall.',
    intro:
      'Credits are a paper-only currency. They don’t unlock anything that affects your trades — their only job is to drive the merch wall, where you can spend them on t-shirts, mugs, and seasonal drops.',
    readingMinutes: 3,
    iconKey: 'coin',
    body: [
      {
        heading: 'How credits are earned',
        copy:
          '{{credits_how_earned_paragraph_1}} Wins pay out flat credit amounts based on challenge tier (look for the payout line on the challenge detail page). {{credits_how_earned_paragraph_2}}',
      },
      {
        heading: 'Spending on the merch wall',
        copy:
          '{{credits_merch_spending_paragraph_1}} Inventory refreshes on the first of each month; the limited drops only run for a few weeks. {{credits_merch_spending_paragraph_2}}',
      },
    ],
  },
  {
    slug: 'community',
    title: 'Community',
    blurb: 'Talk shop with other learners, ask questions, share picks.',
    intro:
      'The Community section is where threads live. Categories cover strategy, news, member picks, clan recruitment, and bug reports. Be respectful — the rules are short and the mods read everything.',
    readingMinutes: 5,
    iconKey: 'chat',
    body: [
      {
        heading: 'Posting a thread',
        copy:
          '{{community_posting_paragraph_1}} Pick the category that fits, write a title that tells other learners what the thread is about, and the body carries the detail. {{community_posting_paragraph_2}}',
      },
      {
        heading: 'Reporting problems',
        copy:
          '{{community_reporting_paragraph_1}} The Report button is on every thread and comment — the mods see the queue in real time and most issues resolve in under a day. {{community_reporting_paragraph_2}}',
      },
    ],
  },
  {
    slug: 'learn',
    title: 'Learn',
    blurb: 'Glossary, explainers, and the PRISM deep dive.',
    intro:
      'The Learn section is the slowest part of the app on purpose. It covers the terms (the glossary), the factors behind every Plain Score (the explainer), and the long-form PRISM deep dive.',
    readingMinutes: 7,
    iconKey: 'book',
    body: [
      {
        heading: 'Using the glossary',
        copy:
          '{{learn_glossary_paragraph_1}} Each term card has a short definition, a longer plain-language explainer, and a link to the source page when one exists. {{learn_glossary_paragraph_2}}',
      },
      {
        heading: 'Reading the explainers',
        copy:
          '{{learn_explainers_paragraph_1}} The explainers are written to read in order — the deeper they go, the more they refer back to the earlier ones. Skim first, then come back when a term comes up in a stock profile. {{learn_explainers_paragraph_2}}',
      },
    ],
  },
];

export function findGuide(slug: string): GuideMeta | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

/** Five-step "Get started in 5 minutes" visual flow on /guide. */
export const QUICK_START_STEPS = [
  {
    n: 1,
    label: 'Read the welcome',
    target: '/guide/getting-started',
    body: 'A two-minute tour of the parts you’ll touch most.',
  },
  {
    n: 2,
    label: 'Pick a stock',
    target: '/discover',
    body: 'Search or filter to one company you already know.',
  },
  {
    n: 3,
    label: 'Open its profile',
    target: '/discover',
    body: 'Read the Plain Score, the factors, and the news layer.',
  },
  {
    n: 4,
    label: 'Place a paper trade',
    target: '/guide/getting-started',
    body: 'Hit Buy on the stock profile — quantity defaults to one share.',
  },
  {
    n: 5,
    label: 'Track your portfolio',
    target: '/portfolio',
    body: 'Watch the position move and learn from the P&L.',
  },
];
