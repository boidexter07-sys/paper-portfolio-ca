'use client';

// Public landing page — logged-out only. Rendered inside the AppShell's
// UnauthHome wrapper on /.
//
// T47 restructure (Nova): the page now leads with competition, not learning.
// ARENA — the gamification engine with 12 challenges, clans, leaderboards,
// merch, and Clan Duels — is the actual differentiator and now anchors the
// hero. Taha's brief: "this is a huge differentiator and something which
// will make people use or not use the platform."
//
// New structure:
//   1. Hero — competition-first headline + animated stats + ARENA phone
//      mockup (real /arena screenshot framed as a device)
//   2. ARENA section — 4 ways to play + screenshot cards + leaderboard
//      preview + clan-recruitment callout
//   3. PRISM explainer card (kept)
//   4. 4 surfaces — Discover / Portfolio / Learn / Glossary (kept)
//   5. 100-term glossary tease (kept)
//   6. Final CTA + no-advice line (kept)
//
// Compliance:
//   - Uses NO_ADVICE_DISCLAIMER for the no-advice line.
//   - No forbidden phrases (no "you should buy", no "guaranteed",
//     no "investment advice", no "beat the market", no "best stocks").
//   - Footer is the global Footer (rendered by AppShell).
//   - All motion respects prefers-reduced-motion (useCountUp +
//     useScrollFade both gate on useReducedMotion internally).

import Link from 'next/link';
import Image from 'next/image';
import { PlainScoreCoin } from './PlainScoreCoin';
import { NO_ADVICE_DISCLAIMER } from '@/lib/disclosures';
import { useCountUp, formatCountUp } from '@/lib/motion';

// ────────────────────────────────────────────────────────────────────────────
// Surface tile — a real product screenshot inside a card.
// Used in Section 2 (ARENA — leaderboards/merch/clans cards) and Section 4
// (the 4 surfaces — Discover/Portfolio/Learn/Glossary).
// ────────────────────────────────────────────────────────────────────────────

type SampleSurface = {
  title: string;
  body: string;
  src: string;
  alt: string;
};

function SurfaceCard({ s }: { s: SampleSurface }) {
  return (
    <div className="pv-card overflow-hidden flex flex-col pv-card-hover transition-shadow">
      <div className="relative w-full aspect-[16/9] bg-fog/40 overflow-hidden rounded-t-md">
        <Image
          src={s.src}
          alt={s.alt}
          width={478}
          height={269}
          sizes="(max-width: 640px) 100vw, 478px"
          className="w-full h-full object-contain"
        />
      </div>
      <div className="p-4 sm:p-5 flex-1">
        <h3 className="font-serif text-h4 text-ink leading-snug">{s.title}</h3>
        <p className="text-body-sm text-graphite mt-1">{s.body}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hero phone-mockup — frames the ARENA surface screenshot as a device.
// Pure CSS (no SVG export required); the screenshot is captured from the
// real /arena route so users see the actual product on first paint.
// ────────────────────────────────────────────────────────────────────────────

function ArenaPhoneMockup() {
  return (
    <div
      className="relative mx-auto"
      style={{ maxWidth: 320 }}
      aria-hidden="true"
    >
      {/* The device frame */}
      <div className="pv-card p-2 shadow-modal" style={{ borderRadius: 28 }}>
        <div className="relative overflow-hidden" style={{ borderRadius: 20 }}>
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-ink rounded-b-full"
               style={{ width: 80, height: 18 }} />
          <Image
            src="/screenshots/v12/surfaces/surface-arena.jpg"
            alt=""
            width={640}
            height={1208}
            sizes="(max-width: 640px) 320px, 320px"
            className="block w-full h-auto select-none"
            draggable={false}
          />
        </div>
      </div>
      {/* Live dot — animated, gated by useReducedMotion via CSS */}
      <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-bone border border-fog rounded-full px-2 py-1 shadow-card">
        <span
          className="inline-block w-2 h-2 rounded-full bg-positive"
          style={{ animation: 'pv-live-dot 1600ms ease-in-out infinite' }}
        />
        <span className="text-caption font-medium text-ink pv-num">LIVE</span>
      </div>
      <style jsx>{`
        @keyframes pv-live-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.85); }
        }
        @media (prefers-reduced-motion: reduce) {
          span { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Animated hero stat — counts up from 0 to N on mount. Tabular numerals so
// the digits don't reflow as they tick up.
// ────────────────────────────────────────────────────────────────────────────

function HeroStat({ target, label, suffix }: { target: number; label: string; suffix?: string }) {
  const v = useCountUp(target, { duration: 900 });
  return (
    <div className="text-center sm:text-left">
      <p className="pv-stat-num">
        {formatCountUp(v, { decimals: 0 })}
        {suffix ? <sup>{suffix}</sup> : null}
      </p>
      <p className="text-caption text-graphite mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Page data — kept inline at the top so editors can tweak copy fast.
// ────────────────────────────────────────────────────────────────────────────

// ARENA section: four ways to play. Each card is 1 sentence + stat.
const ARENA_FORMATS = [
  {
    eyebrow: 'Solo challenges',
    headline: 'Pick a side, stake credits, settle in minutes.',
    body: 'Twelve catalog challenges — earnings, macro, momentum — run on paper schedules you can plan a coffee around.',
    stat: 'C1–C7',
    icon: '🎯',
  },
  {
    eyebrow: 'Clan challenges',
    headline: 'Run with up to 50 players on your roster.',
    body: 'Persistent groups compete weekly across G1–G4 formats. Your clan shows up on the same board every Monday.',
    stat: 'G1–G4',
    icon: '👥',
  },
  {
    eyebrow: 'Clan Duels',
    headline: 'Two clans, one outcome, one prize.',
    body: 'Matchmade head-to-head paper-trading contests (G7). Winner takes the prize pool — loser takes the receipt.',
    stat: 'G7',
    icon: '⚔️',
  },
  {
    eyebrow: 'Leaderboards',
    headline: 'Weekly, all-time, per-category — pick your board.',
    body: 'Climb the weekly top 100 or settle in on the all-time feed. Clan and per-category boards live here too.',
    stat: '4 boards',
    icon: '🏆',
  },
] as const;

// ARENA section screenshot cards — auth-gated pages, captured via Playwright
// from a signed-in demo session. Each title/body describes what users see.
const ARENA_SHOTS: SampleSurface[] = [
  {
    title: 'Climb the leaderboards',
    body: 'Weekly top 100, all-time top 100, per-category top 25 — see where you stack up without scrolling for days.',
    src: '/screenshots/v12/surfaces/surface-leaderboards.jpg',
    alt: 'Leaderboards page showing weekly and all-time player + clan rankings with credit counts.',
  },
  {
    title: 'Win merch',
    body: 'Spend earned credits on gift cards, merch, or charity donations. Local mock fulfillment until the gift card partner goes live.',
    src: '/screenshots/v12/surfaces/surface-merch.jpg',
    alt: 'Rewards page showing merch catalog with credit costs ranging from a few thousand to tens of thousands.',
  },
  {
    title: 'Recruit your clan',
    body: 'Browse open clans, see weekly + all-time totals at a glance, and join one that matches your weekly availability.',
    src: '/screenshots/v12/surfaces/surface-clans.jpg',
    alt: 'Clans directory listing active clans with member counts, weekly credits won, and all-time totals.',
  },
];

// 4 surfaces — same ordering as the v11 capture script (Discover first).
const SURFACES: SampleSurface[] = [
  {
    title: 'Browse 1,216 stocks',
    body: 'Search by ticker or sector. Filter by paper-portfolio signal — Buy, Hold, Sell. No jargon, just numbers you can read.',
    src: '/screenshots/v12/surfaces/surface-discover.jpg',
    alt: 'Discover page showing Hot Picks today with Plain Scores in the 60s.',
  },
  {
    title: 'Practice with paper portfolios',
    body: 'Set up one for value, one for growth, one for the wild ideas. Track paper P&L the same way you would with real money — without the real money part.',
    src: '/screenshots/v12/surfaces/surface-portfolio.jpg',
    alt: 'Portfolio page showing a TSX Value Sleeve with holdings and total paper value.',
  },
  {
    title: 'Learn at your own pace',
    body: 'A 100-term glossary in plain language. Walkthroughs on every page. Tap any word you do not recognize.',
    src: '/screenshots/v12/surfaces/surface-learn.jpg',
    alt: 'Learning Hub with plain-language explainers and a glossary of investing terms.',
  },
  {
    title: 'Read what the words mean',
    body: 'Glossary terms explained like you would explain them to a friend. No finance degree required.',
    src: '/screenshots/v12/surfaces/surface-glossary.jpg',
    alt: 'Glossary page listing common investing terms with plain-language definitions.',
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

// ────────────────────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="space-y-12 pb-4">
      {/* ─── 1. HERO — competition-first ─── */}
      <section className="pv-gradient-hero">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 items-center">
            {/* Copy column */}
            <div className="text-center lg:text-left">
              <p className="pv-eyebrow pv-eyebrow--sentence mb-4">
                Pick stocks. Beat rivals. Win merch.
              </p>
              <h1 className="font-serif text-h1 sm:text-display text-ink leading-[1.05] mb-5">
                Compete head-to-head.{' '}
                <br className="hidden sm:block" />
                Win merch.{' '}
                <span className="text-mark">Build paper-trading skills.</span>
              </h1>
              <p className="text-body-lg text-graphite mb-4 max-w-prose mx-auto lg:mx-0">
                Paper Portfolio Canada runs <strong>ARENA</strong> — a gamified,
                head-to-head paper-trading engine with 12 challenges, clan
                leaderboards, and merch prizes. No real money, no real trades.
              </p>
              <p className="text-caption text-stone mb-8 max-w-prose mx-auto lg:mx-0">
                Built for adults 18+ who want to learn. Not a brokerage. Not investment advice.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/signup" className="pv-btn-mark pv-glow-mark">
                  Start your 7-day free trial
                </Link>
                <Link href="/login" className="pv-btn-secondary">
                  I already have an account
                </Link>
              </div>

              {/* Animated hero stats — count up on mount */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-10 pt-8 border-t border-fog/70 max-w-md mx-auto lg:mx-0">
                <HeroStat target={12} label="Challenges" />
                <HeroStat target={1216} label="Stocks" />
                <HeroStat target={50} label="Per clan" />
              </div>
            </div>

            {/* Phone mockup column — the ARENA in action */}
            <div className="order-first lg:order-last">
              <ArenaPhoneMockup />
              <p className="text-caption text-stone text-center mt-4 max-w-xs mx-auto">
                ARENA dashboard — live challenges, your balance, your rank.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. ARENA SECTION — the differentiator ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="pv-eyebrow pv-eyebrow--sentence text-center mb-3">
          The differentiator
        </p>
        <h2 className="font-serif text-h2 sm:text-h1 text-ink text-center leading-tight max-w-prose mx-auto">
          Most stock games let you play alone. ARENA makes it head-to-head.
        </h2>
        <p className="text-body-lg text-graphite text-center mt-3 max-w-prose mx-auto">
          Twelve ways to play. One leaderboard. Real prizes if you are good enough.
        </p>

        {/* Four ways to play */}
        <div className="pv-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          {ARENA_FORMATS.map((f) => (
            <div key={f.eyebrow} className="pv-card p-5 pv-card-hover transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl" aria-hidden="true">{f.icon}</span>
                <span className="pv-pill pv-pill-positive text-caption">{f.stat}</span>
              </div>
              <p className="pv-eyebrow pv-eyebrow--sentence text-mark mb-1">{f.eyebrow}</p>
              <h3 className="font-serif text-h4 text-ink leading-snug mb-2">{f.headline}</h3>
              <p className="text-body-sm text-graphite">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Three screenshot cards — leaderboards / merch / clans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {ARENA_SHOTS.map((s) => (
            <SurfaceCard key={s.title} s={s} />
          ))}
        </div>

        {/* Live leaderboard preview + clan recruitment (single row on desktop, stack on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Mini leaderboard preview — static markup, not live numbers */}
          <div className="pv-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="pv-eyebrow pv-eyebrow--sentence">This week</p>
              <Link href="/arena/leaderboards" className="pv-link text-caption">
                Full board →
              </Link>
            </div>
            <ol className="space-y-2 text-body-sm">
              {[
                { rank: 1, name: 'Riley K.', cr: 12840 },
                { rank: 2, name: 'Marcus T.', cr: 11210 },
                { rank: 3, name: 'Aiyana C.', cr: 9870 },
              ].map((row) => (
                <li key={row.rank} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="text-caption text-stone w-6 pv-num">#{row.rank}</span>
                    <span className="text-ink">{row.name}</span>
                  </span>
                  <span className="font-serif text-h4 text-positive pv-num">
                    {row.cr.toLocaleString('en-CA')} cr
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Clan recruitment callout */}
          <div className="pv-card p-5 flex flex-col">
            <p className="pv-eyebrow pv-eyebrow--sentence mb-2">Clan recruitment</p>
            <h3 className="font-serif text-h3 text-ink leading-snug mb-2">
              Bring a friend or bring fifty.
            </h3>
            <p className="text-body-sm text-graphite mb-4">
              Clans settle in on persistent weekly schedules. Recruit a friend
              and your clan shows up on the same board every Monday.
            </p>
            <div className="mt-auto flex flex-col sm:flex-row gap-2">
              <Link href="/signup" className="pv-btn-primary">
                Recruit a clan
              </Link>
              <Link href="/arena/clans" className="pv-btn-ghost text-body-sm">
                Browse clans →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. PRISM explainer card (kept) ─── */}
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
              AAPL scored 62 on Monday. <Link href="/stock/AAPL" className="pv-link">Here is why.</Link>
            </p>
          </div>

          {/* Plain Score visual — same view a visitor sees on any stock page */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
            <div className="flex justify-center md:justify-start">
              <PlainScoreCoin score={62} size="lg" />
            </div>
            <div>
              <p className="pv-eyebrow pv-eyebrow--sentence mb-2">Sample Plain Score</p>
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

      {/* ─── 4. 4 surfaces — Discover / Portfolio / Learn / Glossary ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="pv-eyebrow pv-eyebrow--sentence text-center mb-3">
          What you can look at
        </p>
        <h2 className="font-serif text-h2 text-ink text-center leading-tight max-w-prose mx-auto">
          Four surfaces that turn public data into plain language
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {SURFACES.map((s) => (
            <SurfaceCard key={s.title} s={s} />
          ))}
        </div>
      </section>

      {/* ─── 5. What you can learn — 3 example glossary terms ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <p className="pv-eyebrow pv-eyebrow--sentence text-center mb-3">
          What you can learn
        </p>
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

      {/* ─── 6. Final CTA + no-advice line ─── */}
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
