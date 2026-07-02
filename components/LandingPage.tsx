// Altier Edge — Home page (D3 Cinematic Motion).
// 8-section spine per T70 task body §2 / docs/d3-takes-two/section-reference-mapping.md.
// Each section applies ONE reference's structural device.
// §7 is "Get Started" — freemium-first framing, no subscription gate front-of-page.
// Server component. Single motion language: rank row entrance (mounted via client sibling).

import Link from 'next/link';
import { LandingPageClient } from './LandingPage.client';
import { ALTIER_DISCLOSURES } from '@/lib/disclosures';

export function LandingPage() {
  return (
    <>
      {/* §1 · HERO — Supaste type contrast at hero scale, centered */}
      <section className="d3-hero is-rail-aware" id="d3-hero" aria-labelledby="hero-h">
        <div className="d3-hero-body">
          <p className="d3-hero-eyebrow">The Investing Practice Field</p>
          <h1 id="hero-h" className="d3-hero-sans">Real math.</h1>
          <h1 className="d3-hero-serif">Real practice.</h1>
          <p className="d3-hero-sub">
            PRISM scores every stock 0 to 100. ARENA runs the paper-trading competitions on top.
            Real prices, settled at 4:30 p.m. ET.
          </p>
          <div className="d3-hero-cta-row">
            <Link href="/signup" className="d3-btn d3-btn-primary">Start free — score a stock</Link>
            <Link href="/discover" className="d3-btn d3-btn-ghost">See PRISM on a stock</Link>
          </div>
        </div>

        <div className="d3-hero-foot">
          <span>Free to play</span>
          <span>1,247 stocks scored</span>
          <span>Built in Canada</span>
        </div>
      </section>

      {/* HERO SECTION DIVIDER — coastline photo (Supaste move, applied as break, not inside hero) */}
      <div className="d3-hero-divider" aria-hidden="true" />

      {/* §2 · METHOD — CyberCrest texture-per-card, 5 PRISM layers */}
      <section className="d3-section d3-method is-rail-aware" id="d3-method" aria-labelledby="method-h">
        <div className="d3-container">
          <span className="d3-eyebrow">How we score</span>
          <h2 id="method-h" className="d3-h2">
            Five signals. <em>One scale.</em> No hidden model.
          </h2>
          <p className="d3-sub">
            Every PRISM score is built from the same five layers, on the same 0 to 100 scale,
            across every stock in the universe.
          </p>
          <p className="d3-body" style={{ maxWidth: 720, marginBottom: 32 }}>
            A PRISM score is a weighted sum of five named layers. Each layer reads a different
            kind of signal: what the price has been doing, how the price compares to the
            earnings the business produces, whether analyst consensus is moving up or down,
            what insiders are doing with their own money, and how aligned sell-side analysts
            are on the next-twelve-months call. Weights are published. Bands are published.
            Formulas are published.
          </p>

          <div className="d3-method-grid">
            {METHOD_LAYERS.map((m) => (
              <article key={m.id} className={`d3-method-card ${m.cardCls}`}>
                <div>
                  <p className="d3-method-id">[ L · {m.num} ]</p>
                  <h3 className="d3-method-name">{m.name}</h3>
                </div>
                <div>
                  <p className="d3-method-wt">{m.weight}%</p>
                  <p className="d3-method-contrib">sub-score {m.contrib}/100</p>
                </div>
                <p className="d3-method-gloss">{m.gloss}</p>
              </article>
            ))}
          </div>

          <p className="d3-method-foot">
            <span>Weights published</span>
            <span>Bands published</span>
            <span>Formula published</span>
          </p>

          <p
            className="d3-mono"
            style={{
              marginTop: 24,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--d3-ink-faint)',
            }}
          >
            {ALTIER_DISCLOSURES.prismScore}
          </p>
        </div>
      </section>

      {/* §3 · SCORE A STOCK — Future of Finance chrome browser frame */}
      <section className="d3-score is-rail-aware" id="d3-score" aria-labelledby="score-h">
        <div className="d3-container">
          <div className="d3-score-head">
            <h2 id="score-h" className="d3-h2">
              PRISM scored this stock 74 out of 100. <em>Here is why.</em>
            </h2>
            <p className="d3-sub" style={{ margin: '0 auto' }}>
              Same ticker, same scale, same five layers as the table above. The math is the math.
            </p>
          </div>

          <div className="d3-chrome" role="img" aria-label="PRISM terminal showing SHOP.TO at 74 out of 100">
            <div className="d3-chrome-titlebar">
              <span className="d3-chrome-dot r" aria-hidden="true" />
              <span className="d3-chrome-dot y" aria-hidden="true" />
              <span className="d3-chrome-dot g" aria-hidden="true" />
              <span className="d3-chrome-url">altieredge.ca / stock / SHOP.TO</span>
            </div>

            <div className="d3-chrome-body">
              <div className="d3-chrome-header">
                <span className="d3-chrome-ticker">SHOP.TO <small>Shopify Inc · TSX</small></span>
                <span className="d3-chrome-meta">14:24:08 ET · last 24h</span>
              </div>

              <div className="d3-chrome-score-row">
                <div className="d3-chrome-score-left">
                  <span className="d3-chrome-score-num">74</span>
                  <span className="d3-chrome-score-out">/ 100</span>
                </div>
                <span className="d3-chrome-score-action">Paper Buy</span>
              </div>

              <div className="d3-chrome-rows">
                {SCORE_ROWS.map((r, i) => (
                  <div className="d3-chrome-row" key={r.id}>
                    <span className="d3-chrome-row-id">[ L · 0{i + 1} ]</span>
                    <span className="d3-chrome-row-name">{r.name}</span>
                    <span className="d3-chrome-row-wt">{r.weight}%</span>
                    <span className="d3-chrome-row-contrib">{r.contrib.toFixed(1)}</span>
                    <span className="d3-chrome-row-sum">{r.weight}% · {r.contrib.toFixed(1)}</span>
                  </div>
                ))}
                <div className="d3-chrome-row sum">
                  <span className="d3-chrome-row-id">[ Σ ]</span>
                  <span className="d3-chrome-row-name">PLAIN SCORE</span>
                  <span className="d3-chrome-row-wt">100%</span>
                  <span className="d3-chrome-row-contrib">74.0</span>
                  <span className="d3-chrome-row-sum">74.0</span>
                </div>
              </div>

              <p
                className="d3-mono"
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: '1px solid var(--d3-hairline)',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--d3-teal)',
                }}
              >
                {ALTIER_DISCLOSURES.prismInline}
              </p>
            </div>
          </div>

          <p className="d3-score-narrative">
            Momentum is exhausted. Valuation is reasonable. Earnings revisions are positive.
            Hold, with attention to insider selling.
          </p>

          <div className="d3-score-bands">
            <span>Strong Paper Buy 75 to 100</span>
            <span className="is-active">Paper Buy 55 to 74</span>
            <span>Hold 40 to 54</span>
            <span>Paper Sell 20 to 39</span>
            <span>Strong Paper Sell 0 to 19</span>
          </div>

          <div className="d3-score-foot">
            <span className="d3-score-foot-line">1,247 stocks scored</span>
            <span className="d3-score-foot-line">Last 24 hours</span>
          </div>

          <div className="d3-score-cta-row">
            <Link href="/learn" className="d3-btn d3-btn-outline-teal">See full methodology</Link>
          </div>
        </div>
      </section>

      {/* §4 · CREDENTIALS — CyberCrest 3 stat cards + numbered-rail credit */}
      <section className="d3-section d3-credentials is-rail-aware" id="d3-credentials" aria-labelledby="creds-h">
        <div className="d3-container">
          <div className="d3-credentials-head">
            <h2 id="creds-h" className="d3-h2">
              Why this is <em>real.</em>
            </h2>
            <p>
              We build and operate Altier Edge in Canada. The product carries TSX and US tickers
              in one place. Pricing is in CAD. We handle data with PIPEDA in mind. We do not run
              a press list, a newsletter funnel, or a "for you" feed. We publish the methodology.
            </p>
          </div>

          <div>
            <div className="d3-cred-stats">
              {CRED_STATS.map((s) => (
                <div key={s.label} className={`d3-cred-stat ${s.cardCls}`}>
                  <p className="d3-cred-num">{s.num}</p>
                  <div>
                    <p className="d3-cred-label">{s.label}</p>
                    <p className="d3-cred-sub">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="d3-cred-disclosure">
              <p>Built and operated in Canada · TSX and US tickers in one place · CAD pricing · PIPEDA-aware data handling.</p>
              <p>We do not run a press list, a newsletter funnel, or a "for you" feed. We publish the methodology.</p>
              <p>Risk disclosure: ARENA is paper-trading only. Credits are earned inside the app. Merch rewards are not transferable for cash.</p>
            </div>
          </div>
        </div>
      </section>

      {/* §5 · ARENA — MECHANIC — CyberCrest featured-3 + grid-9 */}
      <section className="d3-section d3-mechanic is-rail-aware" id="d3-mechanic" aria-labelledby="mech-h">
        <div className="d3-container">
          <span className="d3-eyebrow d3-eyebrow--magenta">ARENA — Mechanic</span>
          <h2 id="mech-h" className="d3-h2">
            First, the <em className="magenta">rules.</em> Then the leaderboard.
          </h2>
          <p className="d3-sub">
            ARENA is a curated set of paper-trading competitions. The rules are published before
            the first challenge opens.
          </p>
          <p className="d3-body" style={{ maxWidth: 760, marginBottom: 16 }}>
            ARENA runs a small, curated set of paper-trading competitions at any moment — between
            one and seven live right now. Each card carries a name, a tier, a duration, a stake,
            and a payout. Pick the one that fits your read of the week. Stake credits. Watch the
            leaderboard update each day at 4:30 p.m. ET. When the window closes, the top of the
            board gets merch. Everyone else walks away with the score, the lesson, and the credits
            they did not lose.
          </p>
          <p className="d3-body" style={{ maxWidth: 760, marginBottom: 0 }}>
            ARENA is not a place where you buy credits with cash. Credits are earned, not
            purchased. There is no in-app store for credits and no top-up button. You earn
            credits by showing up, finishing a Learn article, and competing.
          </p>

          <div className="d3-mechanic-grid">
            {MECH_FEATURED.map((m) => (
              <article key={m.tier} className={`d3-mech-card ${m.cardCls}`}>
                <div>
                  <span className={`d3-mech-badge ${m.cardCls}`}>{m.tier}</span>
                  <h3 className="d3-mech-name">{m.name}</h3>
                  <p className="d3-mech-desc">{m.desc}</p>
                </div>
                <div className="d3-mech-stake">
                  <span><span className="d3-mech-stake-num">Stake {m.stake}</span></span>
                  <span className="d3-mech-stake-win">Win up to {m.win}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="d3-mech-meta">
            {MECH_META.map((m) => (
              <div key={m.name} className="d3-mech-meta-card">
                <p className={`d3-mech-meta-tier ${m.tierCls}`}>{m.tier}</p>
                <p className="d3-mech-meta-name">{m.name}</p>
                <p className="d3-mech-meta-stake">Stake {m.stake} · {m.duration}</p>
              </div>
            ))}
          </div>

          <div className="d3-mechanic-foot">
            <p>{ALTIER_DISCLOSURES.arenaMechanic}</p>
            <p>Stake 5 · Win up to 8 · Stake 12 · Win up to 30 · Stake 25 · Win up to 75</p>
            <p>Pick a challenge · Stake your credits · Climb the leaderboard.</p>
          </div>
        </div>
      </section>

      {/* §6 · ARENA — RANK — Future of Finance giant-stat rows */}
      <section className="d3-section d3-rank is-rail-aware" id="d3-rank" aria-labelledby="rank-h">
        <div className="d3-container">
          <span className="d3-eyebrow d3-eyebrow--magenta">ARENA — Rank · Last 7 days</span>
          <h2 id="rank-h" className="d3-h2">
            Top of the last <em className="magenta">seven days.</em>
          </h2>
          <p className="d3-sub">
            Anonymized. Settled on real prices. PRISM delta sits next to P&L so you can see
            what the judge saw.
          </p>
          <p className="d3-body" style={{ maxWidth: 760, marginBottom: 0 }}>
            The leaderboard below is anonymized. Settled on real prices at the close of every
            challenge window. Refresh once a day and the board re-ranks. There is no live ticker.
            There is no live ticker. There is no flash on rank change. PRISM delta sits next to P&L so you can read both signals
            at once — what the model thought before the window opened, and what happened by the
            time it closed.
          </p>

          <div className="d3-rank-rows">
            {RANK_ROWS.map((r) => (
              <div key={r.rank} className={`d3-rank-row r${r.rank}`}>
                <span className="d3-rank-num">{String(r.rank).padStart(2, '0')}</span>
                <div>
                  <p className="d3-rank-id">{r.anon}</p>
                  <span className="d3-rank-id-tier">{r.tier}</span>
                </div>
                <div className="d3-rank-delta">
                  {r.deltaPositive ? '+' : ''}
                  {r.delta}
                  <small>PRISM delta</small>
                </div>
                <div className="d3-rank-pnl">
                  {r.pnlPositive ? '+' : ''}
                  {r.pnl}
                  <small>Paper P&amp;L</small>
                </div>
                <div className="d3-rank-weeks">
                  {r.weeks}W
                  <small style={{ display: 'block', fontSize: 9, color: 'var(--d3-ink-faint)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>
                    Hold
                  </small>
                </div>
              </div>
            ))}
          </div>

          <div className="d3-rank-foot">
            <p>Daily summary fires at 4:30 p.m. ET · refresh is a re-rank, not a tick.</p>
            <p>During your first session, the row you would appear in lights up on the next re-rank.</p>
            <p>{ALTIER_DISCLOSURES.arenaRank}</p>
          </div>

          <div className="d3-rank-cta">
            <Link href="/arena" className="d3-btn d3-btn-magenta">Your turn</Link>
          </div>
        </div>
      </section>

      {/* §7 · GET STARTED — freemium-first, no gate. Same teal ring treatment the Trial had,
          refocused: start free, base ARENA stakes free, opt into bigger stakes in-app. */}
      <section className="d3-section d3-trial is-rail-aware" id="d3-trial" aria-labelledby="trial-h">
        <div className="d3-container">
          <div className="d3-trial-inner">
            <h2 id="trial-h" className="d3-trial-head">
              Free to play. <em>Real stakes still paper.</em> No card to start.
            </h2>
            <p className="d3-trial-tagline">Credits, not capital. Rank, not returns.</p>

            <div className="d3-trial-panel">
              <p className="d3-trial-eyebrow">Start Free</p>
              <p className="d3-trial-price">$0<span style={{ fontSize: 24, color: 'var(--d3-ink-muted)', fontFamily: 'var(--font-mono)' }}> to play</span></p>

              <div className="d3-trial-terms">
                <p>Free account — no card</p>
                <p>5-credit base stakes on every ARENA challenge</p>
                <p>PRISM access on 1,247 stocks</p>
                <p>Opt into bigger stakes any time, inside the app</p>
              </div>

              <p className="d3-trial-reinforce">
                You start with starter credits. Credits are not real money. There is no charge
                to play the base layer. Bigger stakes (and merch) are an opt-in from your account.
              </p>

              <Link href="/signup" className="d3-btn d3-btn-primary" style={{ width: '100%', textAlign: 'center', padding: '18px 24px' }}>
                Start free
              </Link>

              <p className="d3-trial-cancel">
                No phone tree. No retention pitch. Close your account in Settings, same day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mount client motion hook at the end so it runs after sections render. */}
      <LandingPageClient />
    </>
  );
}

/* ----------------- Static data for marketing render ----------------- */

const METHOD_LAYERS = [
  {
    id: 'l1',
    num: '01',
    cardCls: 'l1',
    name: 'Price momentum',
    weight: '20',
    contrib: '72',
    gloss: 'What the price has been doing recently across the configured lookback.',
  },
  {
    id: 'l2',
    num: '02',
    cardCls: 'l2',
    name: 'Value vs. earnings',
    weight: '25',
    contrib: '68',
    gloss: 'How the price compares to the earnings the business produces.',
  },
  {
    id: 'l3',
    num: '03',
    cardCls: 'l3',
    name: 'Earnings revisions',
    weight: '15',
    contrib: '79',
    gloss: 'Whether analyst consensus is moving up or down over the recent weeks.',
  },
  {
    id: 'l4',
    num: '04',
    cardCls: 'l4',
    name: 'Insider activity',
    weight: '15',
    contrib: '61',
    gloss: 'What insiders are doing with their own money over the disclosed window.',
  },
  {
    id: 'l5',
    num: '05',
    cardCls: 'l5',
    name: 'Analyst conviction',
    weight: '25',
    contrib: '58',
    gloss: 'How aligned sell-side analysts are on the next-twelve-months call.',
  },
];

const SCORE_ROWS = [
  { id: 'L · 01', name: 'PRICE_MOMENTUM',    weight: 20, contrib: 14.4 },
  { id: 'L · 02', name: 'VALUE_VS_EARNINGS', weight: 25, contrib: 17.0 },
  { id: 'L · 03', name: 'EARNINGS_REVISION', weight: 15, contrib: 11.9 },
  { id: 'L · 04', name: 'INSIDER_FLOW',      weight: 15, contrib:  9.2 },
  { id: 'L · 05', name: 'ANALYST_CONVICTION',weight: 25, contrib: 14.5 },
];

const CRED_STATS = [
  { num: '1,247', cardCls: 's1', label: 'Stocks scored', sub: 'S&P 500 / TSX 60 in the last 24 hours' },
  { num: '17',    cardCls: 's2', label: 'Active challenges', sub: 'Live across Rookie · Pro · Elite' },
  { num: '9',     cardCls: 's3', label: 'Active clans', sub: 'Anonymous, settled at 4:30 p.m. ET' },
];

const MECH_FEATURED = [
  {
    tier: 'Rookie',
    cardCls: 't-rookie',
    name: 'Paper buy a TSX bank.',
    desc: 'Pick one of BMO, RY, TD, BNS. Hold for 7 days. Paper portfolio updates at 4:30 p.m. ET.',
    stake: '5',
    win: '8',
  },
  {
    tier: 'Pro',
    cardCls: 't-pro',
    name: 'Beat the S&P 500.',
    desc: 'Build a 5-stock paper portfolio over 30 days. PRISM delta vs. consensus is the metric.',
    stake: '12',
    win: '30',
  },
  {
    tier: 'Elite',
    cardCls: 't-elite',
    name: 'Eight wins in a row.',
    desc: 'Eight consecutive paper trades where PRISM said Paper Buy and the close matched.',
    stake: '25',
    win: '75',
  },
];

const MECH_META = [
  { tier: 'Rookie', tierCls: 't-rookie', name: 'Baseline Buster',  stake: '5',  duration: '3D' },
  { tier: 'Rookie', tierCls: 't-rookie', name: 'Earnings Reaction',stake: '5',  duration: '1D' },
  { tier: 'Pro',    tierCls: 't-pro',    name: 'Hold The Line',    stake: '12', duration: '5D' },
  { tier: 'Pro',    tierCls: 't-pro',    name: 'Sector Rotation',  stake: '12', duration: '5D' },
  { tier: 'Elite',  tierCls: 't-elite',  name: 'Value Hunt',       stake: '25', duration: '7D' },
  { tier: 'Elite',  tierCls: 't-elite',  name: 'Risk-Adjusted Run',stake: '25', duration: '7D' },
  { tier: 'Elite',  tierCls: 't-elite',  name: 'Pair Trade',       stake: '25', duration: '5D' },
  { tier: 'Pro',    tierCls: 't-pro',    name: 'Group Sweep',      stake: '5',  duration: '3D' },
  { tier: 'Elite',  tierCls: 't-elite',  name: 'Cohort Draft',     stake: '25', duration: '7D' },
];

const RANK_ROWS = [
  { rank: 1, anon: 'M-2914', tier: 'Elite',  delta: 12, deltaPositive: true,  pnl: '18.4%', pnlPositive: true,  weeks: 4 },
  { rank: 2, anon: 'Q-1102', tier: 'Pro',    delta: 8,  deltaPositive: true,  pnl: '12.1%', pnlPositive: true,  weeks: 3 },
  { rank: 3, anon: 'A-7743', tier: 'Rookie', delta: 5,  deltaPositive: true,  pnl: '9.7%',  pnlPositive: true,  weeks: 2 },
  { rank: 4, anon: 'K-0029', tier: 'Pro',    delta: 2,  deltaPositive: true,  pnl: '4.2%',  pnlPositive: true,  weeks: 5 },
  { rank: 5, anon: 'N-6601', tier: 'Rookie', delta: 3,  deltaPositive: false, pnl: '1.8%',  pnlPositive: true,  weeks: 1 },
];
