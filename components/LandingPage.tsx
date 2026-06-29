'use client';

// Public landing page — logged-out only. Rendered inside the AppShell's
// UnauthHome wrapper on /.
//
// T21 brief: when logged out, show:
//   1. Hero: what Paper Portfolio is, who it's for
//   2. "What is PRISM" 3-line explainer
//   3. What you can look at (4 sample surfaces)
//   4. What you can learn (3 example glossary terms)
//   5. Sample PRISM screen (one screenshot)
//   6. Sign up / Sign in CTA
//
// Compliance:
//   - Uses NO_ADVICE_DISCLAIMER for the no-advice line.
//   - No forbidden phrases (no "you should buy", no "guaranteed",
//     no "investment advice", no "beat the market").
//   - Footer is the global Footer (rendered by AppShell).

import Link from 'next/link';
import { PlainScoreCoin } from './PlainScoreCoin';
import { NO_ADVICE_DISCLAIMER } from '@/lib/disclosures';

type SampleSurface = {
  title: string;
  body: string;
  // Inline SVG (no external network calls — keeps the landing static-first).
  visual: React.ReactNode;
};

function SurfaceCard({ s }: { s: SampleSurface }) {
  return (
    <div className="pv-card p-4 sm:p-5 flex flex-col">
      <div className="mb-3">{s.visual}</div>
      <h3 className="font-serif text-h4 text-ink leading-snug">{s.title}</h3>
      <p className="text-body-sm text-graphite mt-1">{s.body}</p>
    </div>
  );
}

function SamplePortfolioSurface() {
  return (
    <svg viewBox="0 0 280 70" className="w-full h-16" aria-hidden>
      <rect x="0" y="10" width="120" height="50" rx="4" fill="#E8EAED" />
      <rect x="130" y="10" width="140" height="50" rx="4" fill="#F0EDE7" />
      <text x="14" y="32" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        AAPL
      </text>
      <text x="14" y="50" fill="#2E6B4F" fontFamily="system-ui" fontSize="12" fontWeight="600">
        +12.4%
      </text>
      <text x="144" y="32" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        SHOP
      </text>
      <text x="144" y="50" fill="#8B2C2C" fontFamily="system-ui" fontSize="12" fontWeight="600">
        −3.1%
      </text>
    </svg>
  );
}

function SampleDiscoverSurface() {
  return (
    <svg viewBox="0 0 280 70" className="w-full h-16" aria-hidden>
      <rect x="0" y="0" width="280" height="70" rx="4" fill="#F7F7F4" />
      <text x="14" y="22" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        Browse stocks
      </text>
      <text x="14" y="50" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        AAPL
      </text>
      <text x="150" y="50" fill="#2E6B4F" fontFamily="system-ui" fontSize="11" fontWeight="600">
        Paper Buy
      </text>
      <text x="14" y="64" fill="#6E7681" fontFamily="system-ui" fontSize="9">
        560 stocks · S&amp;P 500 + TSX 60
      </text>
    </svg>
  );
}

function SampleWatchlistSurface() {
  return (
    <svg viewBox="0 0 280 70" className="w-full h-16" aria-hidden>
      <rect x="0" y="0" width="280" height="70" rx="4" fill="#F7F7F4" />
      <text x="14" y="20" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        Watchlist
      </text>
      <circle cx="20" cy="40" r="6" fill="#7A5230" />
      <text x="34" y="44" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        AAPL
      </text>
      <circle cx="120" cy="40" r="6" fill="#7A5230" />
      <text x="134" y="44" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        SHOP
      </text>
      <circle cx="220" cy="40" r="6" fill="#7A5230" />
      <text x="234" y="44" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        TD
      </text>
    </svg>
  );
}

function SampleGlossarySurface() {
  return (
    <svg viewBox="0 0 280 70" className="w-full h-16" aria-hidden>
      <rect x="0" y="0" width="280" height="70" rx="4" fill="#F7F7F4" />
      <text x="14" y="20" fill="#3A424C" fontFamily="system-ui" fontSize="11">
        Glossary
      </text>
      <text x="14" y="40" fill="#3A424C" fontFamily="system-ui" fontSize="11" fontWeight="600">
        P/E Ratio
      </text>
      <text x="14" y="58" fill="#6E7681" fontFamily="system-ui" fontSize="9">
        How many dollars you pay…
      </text>
      <text x="160" y="40" fill="#3A424C" fontFamily="system-ui" fontSize="11" fontWeight="600">
        ROE
      </text>
      <text x="160" y="58" fill="#6E7681" fontFamily="system-ui" fontSize="9">
        Return on equity
      </text>
    </svg>
  );
}

const SURFACES: SampleSurface[] = [
  {
    title: 'Browse 560 stocks',
    body: 'Search by ticker or sector. Filter by paper-portfolio signal — Buy, Hold, Sell. No jargon, just numbers you can read.',
    visual: <SampleDiscoverSurface />,
  },
  {
    title: 'Practice with paper portfolios',
    body: 'Set up one for value, one for growth, one for the wild ideas. Track paper P&L the same way you would with real money — without the real money part.',
    visual: <SamplePortfolioSurface />,
  },
  {
    title: 'Watch what you want to learn',
    body: 'A short list is more useful than a long one. Drop the stocks you want to track into a watchlist and skim their Plain Scores each week.',
    visual: <SampleWatchlistSurface />,
  },
  {
    title: 'Read what the words mean',
    body: 'Paper Portfolio is a learning tool, so we ship a 100-term glossary in plain language. Click any word that is new to you.',
    visual: <SampleGlossarySurface />,
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
        <p className="pv-eyebrow mb-4">A learning tool for paper portfolios</p>
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

      {/* ─── 2. What is PRISM (3 lines) ─── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p className="pv-eyebrow mb-3">What is PRISM?</p>
        <p className="font-serif text-h3 text-ink leading-snug max-w-prose mx-auto">
          A score from 0 to 100 for each stock, made by a computer that looks at public data —
          price action, the company&apos;s books, and recent news.
        </p>
        <p className="text-body text-graphite mt-3 max-w-prose mx-auto">
          Higher score means the model sees more things going right. Lower means more things
          going sideways or wrong. It is a starting point for learning, not a recommendation.
        </p>
      </section>

      {/* ─── 3. What you can look at — 4 sample surfaces ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <p className="pv-eyebrow text-center mb-3">What you can look at</p>
        <h2 className="font-serif text-h2 text-ink text-center leading-tight max-w-prose mx-auto">
          Four surfaces that turn public data into plain language
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {SURFACES.map((s) => (
            <SurfaceCard key={s.title} s={s} />
          ))}
        </div>
      </section>

      {/* ─── 4. What you can learn — 3 example glossary terms ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <p className="pv-eyebrow text-center mb-3">What you can learn</p>
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

      {/* ─── 5. Sample PRISM screen ─── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="pv-eyebrow text-center mb-3">Sample PRISM screen</p>
        <h2 className="font-serif text-h2 text-ink text-center leading-tight">
          What a Plain Score looks like
        </h2>
        <p className="text-body text-graphite text-center mt-2 max-w-prose mx-auto">
          Here is the same view you will see on any stock page, with a sample Plain Score.
          The page explains every number in plain language.
        </p>
        <div className="mt-6 pv-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="pv-eyebrow">Plain score (sample)</p>
              <p className="font-serif text-display text-ink pv-num leading-none mt-1">62.4</p>
              <p className="text-caption text-stone pv-num">out of 100</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-h2 text-ink">AAPL</p>
              <p className="text-caption text-stone">NASDAQ · Technology</p>
            </div>
          </div>
          <p className="mt-4 text-body text-graphite">
            PRISM says AAPL is a &quot;Paper Buy&quot; right now. The technical picture looks trending up.
            The fundamentals look fairly priced by most measures. This is a paper signal, not investment advice.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <PlainScoreCoin score={62.4} size="lg" />
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="bg-fog/50 rounded-md p-3">
                <p className="pv-eyebrow">Technical picture</p>
                <p className="text-body-sm text-ink mt-1 pv-num">58 / 100</p>
              </div>
              <div className="bg-fog/50 rounded-md p-3">
                <p className="pv-eyebrow">Fundamental picture</p>
                <p className="text-body-sm text-ink mt-1 pv-num">67 / 100</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center mt-4">
          <Link href="/stock/AAPL" className="pv-link text-body-sm">
            See the live AAPL page →
          </Link>
        </p>
      </section>

      {/* ─── 6. CTA + no-advice line ─── */}
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