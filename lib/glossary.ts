// Glossary data loader.
//
// The brand pack keeps the canonical 100-term glossary in
// `content/glossary-v1.json` (one row per term, sorted A-Z).
// We treat that file as the source of truth so when T4 (Muse)
// updates the file, the prototype picks up the new strings with
// no rebuild.

import glossaryJson from './data/glossary.json';

export type GlossaryTerm = {
  term: string;
  definition: string;
  category:
    | 'fundamental'
    | 'general'
    | 'technical'
    | 'value_investing'
    | 'canada_specific'
    | 'paper_trading';
  see_also: string[];
};

export const GLOSSARY_TERMS: GlossaryTerm[] = glossaryJson as GlossaryTerm[];

// Stable, sorted view of the categories actually present in the file
// (otherwise the filter UI shows empty sections if a category goes unused).
export const GLOSSARY_CATEGORIES: { key: GlossaryTerm['category']; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'fundamental', label: 'Fundamentals' },
  { key: 'technical', label: 'Technical' },
  { key: 'value_investing', label: 'Value investing' },
  { key: 'paper_trading', label: 'Paper trading' },
  { key: 'canada_specific', label: 'Canada-specific' },
];

// Lesson cards tied to glossary terms. Each lesson is a short framing
// question (the hook) plus a list of 3-6 glossary terms that the lesson
// builds on. The Learn page renders a Card per lesson; clicking a term
// anchors (and visually highlights) the matching glossary row below.
export type LessonCard = {
  slug: string;
  title: string;
  hook: string;
  minutes: number;
  words: number;
  terms: string[]; // glossary terms this lesson covers
};

export const LESSON_CARDS: LessonCard[] = [
  {
    slug: 'value-investing-101',
    title: 'What is value investing?',
    hook: 'How do you tell whether a stock is cheap for a reason or cheap for a steal?',
    minutes: 5,
    words: 400,
    terms: ['Value Investing', 'Margin of Safety', 'Intrinsic Value', 'Benjamin Graham', 'Mr. Market'],
  },
  {
    slug: 'reading-pe',
    title: 'P/E ratio: the most-quoted number, explained',
    hook: 'You have seen P/E on every stock page. What does it actually mean?',
    minutes: 5,
    words: 350,
    terms: ['P/E Ratio', 'Earnings Per Share (EPS)', 'Trailing Twelve Months (TTM)', 'Earnings Yield'],
  },
  {
    slug: 'reading-balance-sheet',
    title: 'Reading a balance sheet without falling asleep',
    hook: 'Three sections, three jobs. We walk you through them.',
    minutes: 6,
    words: 450,
    terms: ['Balance Sheet', 'Asset', 'Liability', "Shareholders' Equity", 'Book Value', 'Working Capital'],
  },
  {
    slug: 'free-cash-flow',
    title: 'Free cash flow: why Buffett cares more than earnings',
    hook: 'A company can report a profit and still run out of cash. Here is why.',
    minutes: 5,
    words: 400,
    terms: ['Free Cash Flow', 'Cash Flow Statement', 'Operating Cash Flow', 'Capital Expenditure (CapEx)'],
  },
  {
    slug: 'piotroski',
    title: 'The Piotroski F-Score: 9 yes/no questions about a company',
    hook: 'A checklist a professor built to spot quietly improving companies.',
    minutes: 5,
    words: 380,
    terms: ['Piotroski F-Score', 'Return on Equity (ROE)', 'Current Ratio', 'Altman Z-Score'],
  },
  {
    slug: 'margin-of-safety',
    title: 'Margin of safety: Graham\'s most important idea',
    hook: 'If a stock is worth $100 in your best guess, what price should you pay?',
    minutes: 5,
    words: 350,
    terms: ['Margin of Safety', 'Intrinsic Value', 'Value Investing', 'Permanent Loss of Capital'],
  },
  {
    slug: 'circle-of-competence',
    title: 'Circle of competence: knowing what you don\'t know',
    hook: 'You do not need to understand every company. You need to know which ones you do.',
    minutes: 5,
    words: 360,
    terms: ['Circle of Competence', 'Index Fund', 'Sector', 'Diversification'],
  },
  {
    slug: 'read-prism',
    title: 'How to read a Plain Score (and why it is only for paper)',
    hook: 'A number, a label, a sentence. Here is what to make of it.',
    minutes: 5,
    words: 300,
    terms: [
      'Composite Score',
      'Technical Analysis',
      'Fundamental Analysis',
      'Signal',
      'Paper Trade',
    ],
  },
  {
    slug: 'paper-trading',
    title: 'Paper trading: why a fake portfolio is the best first step',
    hook: 'If you have not lost paper money, you have not learned to manage real money.',
    minutes: 4,
    words: 280,
    terms: ['Paper Trade', 'Altier Edge', 'Position', 'Risk Tolerance'],
  },
  {
    slug: 'watchlist',
    title: 'Building your first watchlist (5-10 stocks, 3 sectors, 1 rule)',
    hook: 'A watchlist is your reading list. Here is how to make one you will actually use.',
    minutes: 5,
    words: 320,
    terms: ['Watchlist', 'Sector', 'Diversification', 'Exchange-Traded Fund (ETF)'],
  },
];

// All glossary terms in stable alphabetical order. The Learn page alphabetises
// by the first letter of `term` (case-insensitive).
export function alphabetizedTerms(): GlossaryTerm[] {
  return [...GLOSSARY_TERMS].sort((a, b) =>
    a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })
  );
}
