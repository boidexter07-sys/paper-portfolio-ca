// T91 — /portfolio dashboard on Arcade template
// Brief: briefs/PORTFOLIO-ARCADE-RESKIN.md (altier-edge task T91)
// Palette (locked): navy #0E1A2B / coral #FF6B6B / cyan #22D3EE.
// Type: heavy sans-serif. Empty-state dashboard for unauthenticated
// visitors + real-stock peek from listStocks(). Footer renders the
// shared d3-footer block from the layout (matches landing exactly).

import Link from 'next/link';
import { listStocks } from '@/lib/stocks';

export const dynamic = 'force-dynamic';

// Hard-coded seed list — brief mandates TSLA / NVDA / AAPL / MSFT.
const POPULAR_TICKERS = ['TSLA', 'NVDA', 'AAPL', 'MSFT'];

// Deterministic mock prices + day-change % + 30-day sparkline series.
// Using a seeded PRNG (mulberry32-ish) keyed off the ticker so the
// sparkline shape is stable across SSR renders. Numbers are NOT
// financial advice; visual placeholders until Clerk auth lands.
function seedRand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function tickerSeed(ticker: string) {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function buildSparkline(ticker: string, basePrice: number): number[] {
  const rng = seedRand(tickerSeed(ticker));
  const points: number[] = [];
  let p = basePrice * (0.92 + rng() * 0.08);
  for (let i = 0; i < 30; i++) {
    p = p * (1 + (rng() - 0.5) * 0.04);
    points.push(p);
  }
  const scale = basePrice / points[points.length - 1];
  return points.map((v) => v * scale);
}
function buildMockStock(ticker: string) {
  const rng = seedRand(tickerSeed(ticker) ^ 0xA5A5);
  const price = +(40 + rng() * 480).toFixed(2);
  const changePct = +(((rng() - 0.45) * 6)).toFixed(2);
  return { price, changePct, spark: buildSparkline(ticker, price) };
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
  }).format(n);
}

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const w = 120;
  const h = 36;
  const dx = w / (points.length - 1);
  const y = (v: number) => h - ((v - min) / Math.max(max - min, 0.0001)) * h;
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${((i * dx).toFixed(1))},${(y(v).toFixed(1))}`)
    .join(' ');
  const stroke = up ? '#4ADE80' : '#FF6B6B';
  return (
    <svg
      className="t91-popular-sparkline"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PopularCard({
  ticker,
  name,
  price,
  changePct,
  spark,
}: {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  spark: number[];
}) {
  const up = changePct >= 0;
  const sign = up ? '+' : '';
  return (
    <div className="t91-popular-card">
      <div className="t91-popular-top">
        <span className="t91-popular-ticker">{ticker}</span>
        <span className="t91-popular-name">{name}</span>
      </div>
      <span className="t91-popular-price">{fmtMoney(price)}</span>
      <span className={`t91-popular-change ${up ? 'up' : 'down'}`}>
        {sign}
        {changePct.toFixed(2)}% today
      </span>
      <Sparkline points={spark} up={up} />
    </div>
  );
}

export default function PortfolioPage() {
  // Pull the brief-mandated tickers from the stock catalog when present,
  // fall back to the deterministic mock so the dashboard renders even if
  // a ticker is temporarily absent from the seed DB.
  const stockByTicker = new Map(listStocks().map((s) => [s.ticker.toUpperCase(), s]));
  const popular = POPULAR_TICKERS.map((ticker) => {
    const live = stockByTicker.get(ticker);
    const mock = buildMockStock(ticker);
    return {
      ticker,
      name: live?.name ?? ticker,
      price: live?.cached_price ?? mock.price,
      changePct: mock.changePct,
      spark: mock.spark,
    };
  });

  return (
    <div className="t91" id="t91-portfolio">
      {/* Header — eyebrow "Build" + headline "Your virtual portfolio." (AC2, AC12).
          The headline ships as ONE contiguous text node so the brief's curl
          check can grep "Your virtual portfolio." verbatim. The whole H1 is
          heavy sans at the locked type scale; no inline color split. */}
      <header className="t91-header">
        <span className="t91-eyebrow">Build</span>
        <h1 className="t91-h1">Your virtual portfolio.</h1>
      </header>

      {/* Empty-state hero — 3x3 grid glyph + headline + body */}
      <section className="t91-hero" aria-labelledby="t91-hero-headline">
        <div className="t91-hero-text">
          <h2 id="t91-hero-headline" className="t91-hero-headline">
            Make your first pick.
          </h2>
          <p className="t91-hero-body">
            Pick a stock. Track it. Learn as it moves. No real money, real data.
          </p>
        </div>
        <div className="t91-hero-glyph" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </section>

      {/* 4 stat tiles — Portfolio Value, Day Change, Total Return, Available Cash */}
      <section className="t91-stats" aria-label="Portfolio snapshot">
        <div className="t91-stat">
          <span className="t91-stat-label">Portfolio Value</span>
          <span className="t91-stat-value">$100,000.00</span>
          <span className="t91-stat-sub">Starting paper balance</span>
        </div>
        <div className="t91-stat">
          <span className="t91-stat-label">Day Change</span>
          <span className="t91-stat-value coral">$0.00</span>
          <span className="t91-stat-sub">+0.00% today</span>
        </div>
        <div className="t91-stat">
          <span className="t91-stat-label">Total Return</span>
          <span className="t91-stat-value cyan">+0.00%</span>
          <span className="t91-stat-sub">Since first pick</span>
        </div>
        <div className="t91-stat">
          <span className="t91-stat-label">Available Cash</span>
          <span className="t91-stat-value">$100,000.00</span>
          <span className="t91-stat-sub">Ready to deploy</span>
        </div>
      </section>

      {/* 3 starter action cards with cyan borders */}
      <section className="t91-actions" aria-label="Where to start">
        <p className="t91-actions-head">Where to start</p>
        <div className="t91-actions-grid">
          <Link href="/discover" className="t91-action">
            <span className="t91-action-title">Make your first pick</span>
            <span className="t91-action-sub">
              Browse 560+ stocks. Read PRISM scores. Start with one.
            </span>
            <span className="t91-action-cta">Pick a stock</span>
          </Link>
          <Link href="/discover" className="t91-action">
            <span className="t91-action-title">Browse popular stocks</span>
            <span className="t91-action-sub">
              See what other paper-traders are watching this week.
            </span>
            <span className="t91-action-cta">See the list</span>
          </Link>
          <Link href="/learn" className="t91-action">
            <span className="t91-action-title">Read the basics</span>
            <span className="t91-action-sub">
              Five-minute reads on P/E, market cap, risk, and PRISM scoring.
            </span>
            <span className="t91-action-cta">Start learning</span>
          </Link>
        </div>
      </section>

      {/* Popular stocks peek — TSLA / NVDA / AAPL / MSFT */}
      <section className="t91-popular" aria-label="Popular stocks peek">
        <div className="t91-popular-head">
          <h2>Popular right now</h2>
          <Link href="/discover">See all stocks</Link>
        </div>
        <div className="t91-popular-grid">
          {popular.map((p) => (
            <PopularCard
              key={p.ticker}
              ticker={p.ticker}
              name={p.name}
              price={p.price}
              changePct={p.changePct}
              spark={p.spark}
            />
          ))}
        </div>
      </section>

      {/* Cross-CTA "TODAY'S GAME" coral panel */}
      <section className="t91-crosscta" aria-label="Cross-call-to-action">
        <div className="t91-crosscta-panel">
          <div>
            <span className="t91-crosscta-eyebrow">TODAY'S GAME</span>
            <h3 className="t91-crosscta-headline">Lock your call. See how you read.</h3>
            <p className="t91-crosscta-body">
              One stock. One direction. One day. Run it against the field on the leaderboard.
            </p>
          </div>
          <Link href="/arena" className="t91-crosscta-btn">
            Open Arena
          </Link>
        </div>
      </section>

      {/* Honest paper-trading disclosure. Wrapped in a .t91-disclosure-wrap
          container so the inner paragraph inherits the 40px gutter from the
          rest of the page (the section background stays the same navy as the
          rest of t91). */}
      <section className="t91-disclosure-wrap" aria-label="Disclosure">
        <p className="t91-disclosure">
          altier edge is a paper-trading practice field. No real money is traded, no broker
          account is opened, and no securities are bought or sold. Numbers shown are simulated
          for learning purposes. This is not investment advice.
        </p>
      </section>
    </div>
  );
}
