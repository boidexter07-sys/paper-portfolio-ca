'use client';

// Public landing page — logged-out only. Rendered inside the AppShell's
// UnauthHome wrapper on /.
//
// T26b restructure (Thor): the page now leads with a visually-weighted
// PRISM card (Section 2) instead of a buried 3-line paragraph, the 4
// placeholder SVG surface tiles are replaced with real product screenshots
// captured in v7, the redundant "Sample PRISM screen" section is merged
// into the PRISM card, and section eyebrows drop to sentence case.
//
// Final order:
//   1. Hero — what Paper Portfolio is, who it's for (kept)
//   2. PRISM explainer card — Plain Score visual inline (promoted)
//   3. What you can look at — 4 surfaces with real screenshots
//   4. What you can learn — 3 example glossary terms (kept)
//   5. Final CTA + no-advice line (kept)
//
// Compliance:
//   - Uses NO_ADVICE_DISCLAIMER for the no-advice line.
//   - No forbidden phrases (no "you should buy", no "guaranteed",
//     no "investment advice", no "beat the market").
//   - Footer is the global Footer (rendered by AppShell).

import Link from 'next/link';
import Image from 'next/image';
import { PlainScoreCoin } from './PlainScoreCoin';
import { NO_ADVICE_DISCLAIMER } from '@/lib/disclosures';

type SampleSurface = {
  title: string;
  body: string;
  // Real product screenshot (640px wide, JPEG, ~20-30KB).
  src: string;
  alt: string;
};

function SurfaceCard({ s }: { s: SampleSurface }) {
  return (
    <div className="pv-card overflow-hidden flex flex-col">
      <div className="relative w-full aspect-[16/9] bg-fog/40">
        <Image
          src={s.src}
          alt={s.alt}
          width={640}
          height={360}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px"
          className="w-full h-full object-cover object-top"
          // T26b: real product screenshots replace the v5 placeholder SVGs.
        />
      </div>
      <div className="p-4 sm:p-5 flex-1">
        <h3 className="font-serif text-h4 text-ink leading-snug">{s.title}</h3>
        <p className="text-body-sm text-graphite mt-1">{s.body}</p>
      </div>
    </div>
  );
}

// Surface tile shots — all 1280×800 v7 captures downscaled to 640×360 JPEG
// under /public/screenshots/v8/surfaces/. See v8-build-report.md §3.
const SURFACES: SampleSurface[] = [
  {
    title: 'Browse 1,216 stocks',
    body: 'Search by ticker or sector. Filter by paper-portfolio signal — Buy, Hold, Sell. No jargon, just numbers you can read.',
    src: '/screenshots/v8/surfaces/surface-discover.jpg',
    alt: 'Discover page showing Hot Picks today — top Paper Buy signals like PM, SOBO, CNR, RY with Plain Scores in the 60s.',
  },
  {
    title: 'Practice with paper portfolios',
    body: 'Set up one for value, one for growth, one for the wild ideas. Track paper P&L the same way you would with real money — without the real money part.',
    src: '/screenshots/v8/surfaces/surface-portfolio.jpg',
    alt: 'Portfolio page showing a TSX Value Sleeve with holdings RY, TD, ENB, BNS, BMO and total paper value $92,062 (+40.43%).',
  },
  {
    title: 'Watch what you want to learn',
    body: 'A short list is more useful than a long one. Drop the stocks you want to track into a watchlist and skim their Plain Scores each week.',
    src: '/screenshots/v8/surfaces/surface-watchlist.jpg',
    alt: 'Discover page filtered to Hold signals — every stock in the universe with its Plain Score and tier, browsable at a glance.',
  },
  {
    title: 'Read what the words mean',
    body: 'Paper Portfolio is a learning tool, so we ship a 100-term glossary in plain language. Click any word that is new to you.',
    src: '/screenshots/v8/surfaces/surface-glossary.jpg',
    alt: 'Learning hub showing the plain-language glossary with terms like P/E Ratio, ROE, and Margin of Safety explained in everyday English.',
  },
];

// Three example glossary terms surfaced on the landing page (T21 brief).
const EXAMPLE_TERMS: { term: string; definition: string }[] = [
  {
    term: 'P/E Ratio',
    definition: 'How many dollars you pay for each dollar of a company\'s yearly profit. Lower usually means cheaper.',
  },
  {
    term: 'Margin of Safety',
    definition: 'The gap between what you think something is worth and what you pay for it.',
  },
  {
    term: 'Free Cash Flow',
    definition: 'The cash a company has left after paying its bills and reinvesting in the business.',
  },
];

export function LandingPage() {
  return (
    <div className="space-y-12">
      {/* ─── 1. Hero ─── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 text-center">
        <p className="pv-eyebrow pv-eyebrow--sentence mb-4">A learning tool for paper portfolios</p>
        <h1 className="font-serif text-h1 sm:text-display text-ink leading-tight mb-4">
          Learn to read a stock.{' '}
          <br className="hidden sm:block" />
          Practice with a paper portfolio.
        </h1>
        <p className="text-body-lg text-graphite mb-6 max-w-prose mx-auto">
          Paper Portfolio Canada turns the noise of investing into plain language. Practice with a paper
          portfolio. Read plain-language signals. Never risk a real dollar.
        </p>
        <p className="text-caption text-stone mb-8 max-w-prose mx-auto">
          Built for adults 18+ who want to learn. Not a brokerage. Not investment advice.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="pv-btn-primary">
            Start your 7-day free trial
          </Link>
          <Link href="/login" className="pv-btn-secondary">
            I already have an account
          </Link>
        </div>
      </section>

      {/* ─── 2. PRISM explainer card (promoted from buried paragraph, T26b) ───
          This card now does the work the old "Sample PRISM screen" section
          did: it carries the live Plain Score visual inline so the visitor
          sees the actual product shape, not a paragraph about it. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="pv-card p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="pv-eyebrow pv-eyebrow--featured mb-3">What is PRISM?</p>
            <h2 className="font-serif text-h2 sm:text-h1 text-ink leading-tight">
              PRISM is a model that scores every stock from 0 to 100. It reads the same public data a serious investor would — price action, fundamentals, and recent news — and turns it into one number you can act on.
            </h2>
            <p className="text-body text-graphite mt-3 max-w-prose">
              A higher score means more factors lined up in the stock&apos;s favour. A lower score means more headwinds. The number is a starting point — your judgment comes next.
            </p>
            <p className="text-body text-graphite mt-2 max-w-prose">
              AAPL scored 62 on Monday. <a href="#prism-example" className="underline">Here is why.</a>
            </p>
          </div>

          {/* Plain Score visual — the same view a visitor sees on any stock page */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
            <div className="flex justify-center md:justify-start">
              <PlainScoreCoin score={62} size="lg" />
            </div>
            <div>
              <p className="pv-eyebrow pv-eyebrow--sentence mb-2">Sample Plain Score</p>
              {/* T27b Option B: removed the duplicate giant "62.4" — the
                  PlainScoreCoin on the left already renders the number inside
                  the coin, so the right column is just the caption + breakdown. */}
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-caption text-stone pv-num mt-1">out of 100 · AAPL · Paper Buy</p>
                </div>
                <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                  <div className="bg-fog/50 rounded-md p-3">
                    <p className="pv-eyebrow pv-eyebrow--sentence">Technical picture</p>
                    <p className="text-body-sm text-ink mt-1 pv-num">58 / 100</p>
                  </div>
                  <div className="bg-fog/50 rounded-md p-3">
                    <p className="pv-eyebrow pv-eyebrow--sentence">Fundamental picture</p>
                    <p className="text-body-sm text-ink mt-1 pv-num">67 / 100</p>
                  </div>
                </div>
              </div>
              <p className="text-body-sm text-graphite mt-4 max-w-prose">
                Every Plain Score page explains the number in plain language, so you can read the
                &quot;why&quot; before you decide what (if anything) to do. See a live example:{' '}
                <Link href="/stock/AAPL" className="pv-link">AAPL</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. What you can look at — 4 surfaces with real screenshots ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <p className="pv-eyebrow pv-eyebrow--sentence text-center mb-3">What you can look at</p>
        <h2 className="font-serif text-h2 text-ink text-center leading-tight max-w-prose mx-auto">
          Four surfaces that turn public data into plain language
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {SURFACES.map((s) => (
            <SurfaceCard key={s.title} s={s} />
          ))}
        </div>
      </section>

      {/* ─── 4. What you can learn — 3 example glossary terms ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <p className="pv-eyebrow pv-eyebrow--sentence text-center mb-3">What you can learn</p>
        <h2 className="font-serif text-h2 text-ink text-center leading-tight max-w-prose mx-auto">
          A 100-term glossary in plain language
        </h2>
        <p className="text-body text-graphite text-center mt-2 max-w-prose mx-auto">
          Here is a taste. Click through to read the whole glossary.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {EXAMPLE_TERMS.map((t) => (
            <li key={t.term} className="pv-card p-4">
              <p className="text-body-sm font-medium text-ink">{t.term}</p>
              <p className="text-body-sm text-graphite mt-1">{t.definition}</p>
            </li>
          ))}
        </ul>
        <p className="text-center mt-4">
          <Link href="/learn" className="pv-link text-body-sm">
            Open the learning hub →
          </Link>
        </p>
      </section>

      {/* ─── 5. CTA + no-advice line ───
          (T26b: the old "Sample PRISM screen" section was deleted; its
          visual now lives inline in Section 2 above, where it has more
          weight as part of the PRISM explainer.) */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 text-center">
        <h2 className="font-serif text-h2 text-ink leading-tight mb-3">
          Ready to read your first stock?
        </h2>
        <p className="text-body text-graphite mb-6 max-w-prose mx-auto">
          A 7-day free trial gives you full access. No automatic charges. Cancel anytime.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="pv-btn-primary">
            Start your 7-day free trial
          </Link>
          <Link href="/login" className="pv-btn-secondary">
            I already have an account
          </Link>
        </div>
        <p className="text-caption text-stone mt-6 max-w-prose mx-auto">
          {NO_ADVICE_DISCLAIMER.short} Read the full{' '}
          <Link href="/learn" className="pv-link">Learning Hub</Link>.
        </p>
      </section>
    </div>
  );
}