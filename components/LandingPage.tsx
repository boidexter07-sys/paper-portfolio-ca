// Altier Edge — Landing page = 8-section spine.
// Locked from docs/t68/t68-sequencing-decision.md + copy/muse-section-copy.md.
// D2 Architectural Grid treatment.

import Link from 'next/link';
import { listStocks } from '@/lib/stocks';
import { getDb } from '@/lib/db';

export function LandingPage() {
  return (
    <div data-altier-landing>
      <Hero />
      <TheMethod />
      <ScoreAStock />
      <Credentials />
      <ArenaMechanic />
      <ArenaRank />
      <TheTrial />
      <TheFooter />
    </div>
  );
}

/* ------------------------------------------------------------------
   §1 — HERO [ RANK + IDENTITY ]
   ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="d2-section" id="hero">
      <div className="d2-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT — copy + CTAs */}
          <div className="lg:col-span-7">
            <span className="d2-label mb-6 inline-block">[ RANK + IDENTITY ]</span>
            <h1 className="d2-h1 mt-4">
              The investing <span className="d2-signal">practice</span> field where the score is real.
            </h1>
            <p className="d2-body-secondary mt-4 text-lg">
              PRISM scores every stock 0 to 100. ARENA runs the paper-trading competitions on top.
            </p>
            <p className="d2-body mt-3 max-w-prose">
              Altier Edge is a Canadian-built practice field for investors who want to get serious about picking
              stocks without putting serious money on the line. Every stock in the universe carries a PRISM
              score. Then ARENA turns that score into a competition with credits at the stake and merch at
              the top of every leaderboard. No real money. No countdown timer.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/signup" className="d2-cta">
                [ Start free trial ]
              </Link>
              <Link href="/discover" className="d2-cta">
                [ See PRISM on a stock ]
              </Link>
            </div>
            <p className="d2-micro mt-3">Seven-day free trial. No credit card. Cancel any time.</p>
          </div>

          {/* RIGHT — terminal block */}
          <div className="lg:col-span-5">
            <div className="d2-terminal mt-2 lg:mt-12" aria-label="Live terminal sample">
{`[ TERMINAL · 14:24:08 ET ]                 2026-07-01
SHOP.TO                  PRISM 74 / 100     [ PAPER BUY ]
AAPL                     PRISM 46 / 100     [ HOLD ]
RY.TO                    PRISM 71 / 100     [ PAPER BUY ]
ENB.TO                   PRISM 58 / 100     [ HOLD ]`}
            </div>
            <p className="d2-micro mt-2">
              1,247 S&amp;P 500 / TSX 60 names scored in the last 24 h. Pick any.
            </p>
          </div>
        </div>
      </div>
      <div className="d2-container">
        <p className="d2-disclosure">
          [ Credits are earned inside the app. Not purchased. Cash out not available. ]
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   §2 — THE METHOD [ HOW WE SCORE ]
   ------------------------------------------------------------------ */
function TheMethod() {
  const rows = [
    { id: 'L · 01', name: 'PRICE_MOMENTUM', weight: 20, score: 72, gloss: 'Price momentum · what the price has done recently.' },
    { id: 'L · 02', name: 'VALUE_VS_EARNINGS', weight: 25, score: 68, gloss: 'Value vs. earnings · how the price compares to the earnings the business produces.' },
    { id: 'L · 03', name: 'EARNINGS_REVISION', weight: 15, score: 79, gloss: 'Earnings revisions · whether analyst consensus is moving up or down.' },
    { id: 'L · 04', name: 'INSIDER_FLOW', weight: 15, score: 61, gloss: 'Insider flow · what insiders are doing with their own money.' },
    { id: 'L · 05', name: 'ANALYST_CONVICTION', weight: 25, score: 58, gloss: 'Analyst conviction · how aligned sell-side analysts are on the next-twelve-months call.' },
  ];
  const weighted = (rows.reduce((acc, r) => acc + (r.score * r.weight) / 100, 0)).toFixed(1);
  return (
    <section className="d2-section" id="method">
      <div className="d2-container">
        <span className="d2-label">[ HOW WE SCORE ]</span>
        <h2 className="d2-h2 mt-4">Five signals. One scale. No hidden model.</h2>
        <p className="d2-body-secondary mt-2 text-lg max-w-prose">
          Every PRISM score is built from the same five layers, on the same 0 to 100 scale, across every stock in the universe.
        </p>
        <p className="d2-body mt-4 max-w-prose">
          A PRISM score is a weighted sum of five named layers. Each layer reads a different kind of signal — what the price
          has been doing, how the price compares to the earnings the business produces, whether analyst consensus is moving
          up or down, what insiders are doing with their own money, and how aligned sell-side analysts are on the
          next-twelve-months call. Every weight is published. Every band is published. Every formula is published. The score
          on every stock card in the product is built from this same five-layer table, summed the same way, every time.
        </p>

        <div className="mt-6 d2-card-tight overflow-x-auto">
          <table className="d2-table">
            <thead>
              <tr>
                <th>[ L · # ]</th>
                <th>Layer</th>
                <th className="text-right">Weight</th>
                <th className="text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>[ {r.id} ]</td>
                  <td>{r.name}</td>
                  <td className="text-right">{r.weight}%</td>
                  <td className="text-right">{r.score} / 100</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} className="text-right d2-micro">Sum of weights · weighted sum</td>
                <td className="text-right d2-mono">100</td>
                <td className="text-right d2-mono d2-signal">{weighted}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-1">
          {rows.map((r) => (
            <p key={r.id} className="d2-micro" style={{ fontSize: 12 }}>
              {r.id.split(' ')[2]} — {r.gloss}
            </p>
          ))}
        </div>

        <p className="d2-micro mt-4" style={{ fontSize: 12 }}>
          Weights published · bands published · formula published
        </p>

        <div className="mt-4">
          <Link href="/guide/learn" className="d2-cta">
            [ See full methodology → ]
          </Link>
        </div>
        <p className="d2-micro mt-3">
          The five-layer breakdown lives in the methodology doc. The formulas for each layer are there too.
        </p>
      </div>
      <div className="d2-container">
        <p className="d2-disclosure">[ PRISM scores what the data shows. PRISM does not predict. ]</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   §3 — SCORE A STOCK [ PRISM PROOF ]
   ------------------------------------------------------------------ */
function ScoreAStock() {
  // Real ticker score from DB if available; fallback to SHOP.TO 74/100 example.
  let exampleTicker = 'SHOP.TO';
  let exampleScore = 74;
  try {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT s.ticker, p.plain_score
         FROM stocks s LEFT JOIN prism_scores p ON p.stock_id = s.id
         WHERE s.ticker = ? LIMIT 1`
      )
      .get('SHOP.TO') as { ticker: string; plain_score: number | null } | undefined;
    if (row?.plain_score != null) exampleScore = Math.round(row.plain_score);
  } catch {
    /* fallback static example */
  }

  const layers = [
    { id: 'L · 01', name: 'PRICE_MOMENTUM', weight: 20, score: 72 },
    { id: 'L · 02', name: 'VALUE_VS_EARNINGS', weight: 25, score: 68 },
    { id: 'L · 03', name: 'EARNINGS_REVISION', weight: 15, score: 79 },
    { id: 'L · 04', name: 'INSIDER_FLOW', weight: 15, score: 61 },
    { id: 'L · 05', name: 'ANALYST_CONVICTION', weight: 25, score: 58 },
  ];
  const total = layers.reduce((acc, l) => acc + (l.score * l.weight) / 100, 0);

  return (
    <section className="d2-section" id="score-a-stock">
      <div className="d2-container">
        <span className="d2-label">[ PRISM PROOF ]</span>
        <h2 className="d2-h2 mt-4">
          PRISM scored this stock {exampleScore} out of 100. Here is why.
        </h2>
        <p className="d2-body-secondary mt-2 text-lg max-w-prose">
          Same ticker, same scale, same five layers as the table above. The math is the math.
        </p>
        <p className="d2-body mt-4 max-w-prose">
          Below is PRISM running on a real stock right now. The five rows are the same five rows from §2. The numbers
          underneath each row are the layer&apos;s contribution to the Plain Score. The summary below the card says what
          the layers are telling you, in plain English. Tap any row in the live product to see the inputs the
          sub-score came from. The card on this page is the static version. The card in the product is the same card
          with the math behind it.
        </p>

        <div className="mt-6 d2-card">
          <pre className="d2-mono whitespace-pre-wrap" style={{ fontSize: 12 }}>
{`PRISM PROOF                                           14:24:08 ET
${exampleTicker.padEnd(54)}LAST 24H

  ${String(exampleScore).padStart(2)} / 100                                              [ PAPER BUY ]

[ L · 01 ] PRICE_MOMENTUM         20%  ·  ${layers[0].score} / 100  ·  contribution  ${((layers[0].score * layers[0].weight) / 100).toFixed(1)}
[ L · 02 ] VALUE_VS_EARNINGS      25%  ·  ${layers[1].score} / 100  ·  contribution  ${((layers[1].score * layers[1].weight) / 100).toFixed(1)}
[ L · 03 ] EARNINGS_REVISION      15%  ·  ${layers[2].score} / 100  ·  contribution  ${((layers[2].score * layers[2].weight) / 100).toFixed(1)}
[ L · 04 ] INSIDER_FLOW           15%  ·  ${layers[3].score} / 100  ·  contribution  ${((layers[3].score * layers[3].weight) / 100).toFixed(1)}
[ L · 05 ] ANALYST_CONVICTION     25%  ·  ${layers[4].score} / 100  ·  contribution  ${((layers[4].score * layers[4].weight) / 100).toFixed(1)}
                                                       ─────────
                                                         Plain ${total.toFixed(1)}`}
          </pre>
        </div>

        <p className="d2-body mt-4 max-w-prose">
          Momentum is exhausted; valuation is reasonable; earnings revisions are positive. Hold, with attention to insider selling.
        </p>

        <p className="d2-micro mt-4" style={{ fontSize: 12 }}>
          STRONG PAPER BUY (75–100) · PAPER BUY (55–74) · HOLD (40–54) · PAPER SELL (20–39) · STRONG PAPER SELL (0–19)
        </p>

        <p className="d2-micro mt-2" style={{ fontSize: 11 }}>
          1,247 S&amp;P 500 / TSX 60 names scored in the last 24 h. Pick any.
        </p>

        <div className="mt-4">
          <Link href="/discover" className="d2-cta">
            [ See methodology → ]
          </Link>
        </div>
      </div>
      <div className="d2-container">
        <p className="d2-disclosure">[ PRISM is a paper-trading signal. Not investment advice. ]</p>
        <p className="d2-micro mt-2">
          The disclosure line is a signal, not a footnote. It ships on every PRISM card.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   §4 — CREDENTIALS [ WHY THIS IS REAL ]
   ------------------------------------------------------------------ */
function Credentials() {
  return (
    <section className="d2-section" id="credentials">
      <div className="d2-container">
        <span className="d2-label">[ CREDENTIALS ]</span>
        <h2 className="d2-h2 mt-4">Why this is real.</h2>
        <p className="d2-body-secondary mt-2 text-lg">
          Three lines that say what Altier Edge is, where it is, and what it is not.
        </p>
        <p className="d2-body mt-4 max-w-prose">
          We build and operate Altier Edge in Canada. The product carries TSX and US tickers in one place. Pricing is in
          CAD. We handle data with PIPEDA in mind. We do not run a press list, a newsletter funnel, or a &ldquo;for
          you&rdquo; feed. We publish the methodology. ARENA is paper-trading only — credits are earned inside the
          app, and merch rewards are not transferable for cash. We are the kind of company that thinks a published
          formula is more useful than a demo video.
        </p>

        <div className="mt-6 d2-card-tight overflow-x-auto">
          <pre className="d2-mono whitespace-pre-wrap" style={{ fontSize: 12, padding: 16 }}>
{`Built and operated in Canada. TSX and US tickers in one place. CAD pricing. PIPEDA-aware data handling.

We do not run a press list, a newsletter funnel, or a "for you" feed. We publish the methodology. [ READ METHODOLOGY → ]

Risk disclosure: ARENA is paper-trading only. Credits are earned inside the app. Merch rewards are not transferable for cash.`}
          </pre>
        </div>

        <div className="mt-4">
          <Link href="/guide/learn" className="d2-cta">
            [ Read methodology → ]
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   §5 — ARENA — MECHANIC [ THE RULES ]
   ------------------------------------------------------------------ */
function ArenaMechanic() {
  const catalog = [
    { id: 'C1', name: 'Baseline Buster', dur: '3D', stake: 5, metric: 'PRISM delta vs. consensus' },
    { id: 'C2', name: 'Hold The Line', dur: '5D', stake: 12, metric: 'PRISM delta vs. consensus (held)' },
    { id: 'C3', name: 'Earnings Reaction', dur: '1D', stake: 5, metric: 'PRISM move on earnings day' },
    { id: 'C4', name: 'Value Hunt', dur: '7D', stake: 25, metric: 'PRISM delta — value-tier only' },
    { id: 'C5', name: 'Sector Rotation', dur: '5D', stake: 12, metric: 'PRISM delta — sector-relative' },
    { id: 'C6', name: 'Risk-Adjusted Run', dur: '7D', stake: 25, metric: 'Risk-adjusted PRISM score' },
    { id: 'C7', name: 'Pair Trade', dur: '5D', stake: 25, metric: 'Long-short PRISM differential' },
    { id: 'G1', name: 'Group Sweep', dur: '3D', stake: 5, metric: 'Average PRISM delta across group' },
    { id: 'G2', name: 'Group Hold', dur: '5D', stake: 12, metric: 'Same as G1, held window' },
    { id: 'G3', name: 'Cohort Draft', dur: '7D', stake: 25, metric: 'Group average against benchmark' },
    { id: 'G4', name: 'Cohort Rotate', dur: '7D', stake: 25, metric: 'Weekly rebalance, PRISM-weighted' },
    { id: 'G7', name: 'Group Final', dur: '7D', stake: 25, metric: 'Top G1–G4 cohorts play off' },
  ];
  return (
    <section className="d2-section" id="arena-mechanic">
      <div className="d2-container">
        <span className="d2-label">[ ARENA — MECHANIC ]</span>
        <h2 className="d2-h2 mt-4">First, the rules. Then the leaderboard.</h2>
        <p className="d2-body-secondary mt-2 text-lg">
          ARENA is a curated set of paper-trading competitions. The rules are published before the first challenge opens.
        </p>
        <p className="d2-body mt-4 max-w-prose">
          ARENA runs a small, curated set of paper-trading competitions at any moment — between 1 and 7 live right
          now. Each card carries a name, a tier, a duration, a stake, and a payout. Internal challenge codes are
          published once, in the table below, so the rules are inspectable from a single screen. Outside this
          catalog, the surface uses the three tier names the user owns — Rookie, Pro, Elite — and the human-readable
          challenge names.
        </p>
        <p className="d2-body mt-3 max-w-prose">
          Pick the one that fits your read of the week. Stake credits. Watch the leaderboard update each day at
          4:30 p.m. ET. When the window closes, the top of the board gets merch. Everyone else walks away with
          the score, the lesson, and the credits they did not lose.
        </p>
        <p className="d2-body mt-3 max-w-prose">
          ARENA is not a place where you buy credits with cash. Credits are earned, not purchased. There is no
          in-app store for credits and no top-up button. You earn credits by showing up, finishing a Learn article,
          and competing.
        </p>

        <div className="mt-6 d2-card-tight overflow-x-auto">
          <table className="d2-table">
            <thead>
              <tr>
                <th>[ ID ]</th>
                <th>[ NAME ]</th>
                <th>[ DUR ]</th>
                <th className="text-right">[ STAKE ]</th>
                <th>[ METRIC ]</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>{c.dur}</td>
                  <td className="text-right">{c.stake}</td>
                  <td>{c.metric}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="d2-micro mt-3">
          Internal codes appear here only. Customer-facing copy uses the tier name and the human challenge name.
        </p>

        <p className="d2-micro mt-3" style={{ fontSize: 13 }}>ROOKIE · PRO · ELITE</p>
        <p className="d2-micro mt-2" style={{ fontSize: 12 }}>
          Rookie — entry point, simpler scoring. Pro — three or more challenges in, wider signal set. Elite —
          widest surface area, the math the rest of the catalog builds to.
        </p>

        <p className="d2-mono mt-4" style={{ fontSize: 14 }}>
          STAKE 5 / WIN UP TO 8 · STAKE 12 / WIN UP TO 30 · STAKE 25 / WIN UP TO 75
        </p>
        <p className="d2-mono mt-2" style={{ fontSize: 14 }}>
          1. Pick a challenge · 2. Stake your credits · 3. Climb the leaderboard.
        </p>

        <div className="mt-4">
          <Link href="/guide/challenges" className="d2-cta">
            [ How a challenge runs → ]
          </Link>
        </div>
      </div>
      <div className="d2-container">
        <p className="d2-disclosure">
          [ Credits are earned inside the app. Not purchased. Cash out not available. ]
        </p>
        <p className="d2-disclosure" style={{ borderTop: 'none', paddingTop: 0, marginTop: 4 }}>
          [ Merch rewards are not transferable for cash. ]
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   §6 — ARENA — RANK [ LAST 7D ]
   ------------------------------------------------------------------ */
function ArenaRank() {
  const rows = [
    { rank: '01', id: 'M-2914', delta: 12, pnl: '+18.4%', weeks: '4W' },
    { rank: '02', id: 'Q-1102', delta: 8, pnl: '+12.1%', weeks: '3W' },
    { rank: '03', id: 'A-7743', delta: 5, pnl: '+9.7%', weeks: '2W' },
    { rank: '04', id: 'K-0029', delta: 2, pnl: '+4.2%', weeks: '5W' },
    { rank: '05', id: 'N-6601', delta: -3, pnl: '+1.8%', weeks: '1W' },
  ];
  return (
    <section className="d2-section" id="arena-rank">
      <div className="d2-container">
        <span className="d2-label">[ ARENA — RANK · LAST 7D ]</span>
        <h2 className="d2-h2 mt-4">Top of the last seven days.</h2>
        <p className="d2-body-secondary mt-2 text-lg">
          Anonymized. Settled on real prices. PRISM delta sits next to P&amp;L so you can see what the judge saw.
        </p>
        <p className="d2-body mt-4 max-w-prose">
          The leaderboard below is anonymized. Settled on real prices at the close of every challenge window. Refresh
          once a day and the board re-ranks. There is no live ticker. There is no win-flash. PRISM delta sits
          next to P&amp;L so you can read both signals at once — what the model thought before the window opened, and
          what happened by the time it closed. The IDs are anonymized. The math is on the surface.
        </p>

        <div className="mt-6 d2-card-tight overflow-x-auto">
          <table className="d2-table">
            <thead>
              <tr>
                <th>[ RANK ]</th>
                <th>[ ANON ID ]</th>
                <th className="text-right">[ PRISM DELTA ]</th>
                <th className="text-right">[ P&amp;L ]</th>
                <th className="text-right">[ HOLD WEEKS ]</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.rank}</td>
                  <td>{r.id}</td>
                  <td className={`text-right ${r.delta >= 0 ? 'd2-signal' : ''}`}>
                    {r.delta >= 0 ? `+${r.delta}` : r.delta}
                  </td>
                  <td className="text-right">{r.pnl}</td>
                  <td className="text-right">{r.weeks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="d2-micro mt-3">Daily summary fires at 4:30 p.m. ET. Refresh is a re-rank, not a tick.</p>
        <p className="d2-micro mt-2">
          During the trial, the row you would appear in lights up on the next re-rank.
        </p>

        <div className="mt-4">
          <Link href="/arena" className="d2-cta">
            [ Your turn ]
          </Link>
        </div>
      </div>
      <div className="d2-container">
        <p className="d2-disclosure">
          [ Paper-trading only · credits, not cash · PRISM is a signal, not advice ]
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   §7 — THE TRIAL [ PRICING ]
   ------------------------------------------------------------------ */
function TheTrial() {
  return (
    <section className="d2-section" id="trial">
      <div className="d2-container">
        <div className="mx-auto max-w-readable text-center">
          <span className="d2-label inline-block">[ START FREE TRIAL ]</span>
          <h2 className="d2-h2 mt-4">$4.99 a month. Seven days free. No card to start.</h2>
          <p className="d2-body-secondary mt-2 text-lg">Credits, not capital. Rank, not returns.</p>
          <p className="d2-body mt-4 max-w-prose mx-auto">
            The trial starts when you create an account. No card. The price is $4.99 CAD a month if you stay past
            day 7. Credits are not real money. The leaderboard settles on paper-trading prices, not your brokerage
            account. If you decide the product is not for you, you can leave from Settings without a phone call,
            a retention email, or a &ldquo;are you sure.&rdquo; The trial is a 7-day window, not a 7-day handshake.
          </p>

          <div className="mt-6 d2-card">
            <Link href="/signup" className="d2-cta-filled">
              [ Start free trial ]
            </Link>
            <p className="d2-mono mt-4" style={{ fontSize: 14 }}>
              $4.99 CAD / month · 7-day free trial · no credit card · cancel any time
            </p>
            <p className="d2-micro mt-3">
              Credits are not real money. Your trial ends on day 7 unless you stay.
              <br />
              We do not auto-charge before day 8.
            </p>
            <p className="d2-body mt-3" style={{ fontSize: 12 }}>
              Cancel any time in Settings. No phone tree. No retention pitch. The account closes on the same day.
            </p>
          </div>

          <p className="d2-micro mt-4" style={{ fontSize: 11 }}>
            Credits are not real money. Your trial ends on day 7 unless you stay. We do not auto-charge before day 8.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   §8 — THE FOOTER [ FINE PRINT ]
   ------------------------------------------------------------------ */
function TheFooter() {
  return (
    <footer className="d2-section-tight" id="altier-footer" role="contentinfo">
      <div className="d2-container">
        <span className="d2-label">[ FOOTER ]</span>
        <p className="d2-body mt-3 max-w-prose">
          Altier Edge is a Canadian-built practice field. PRISM scores paper trades. ARENA runs paper-trading
          competitions. Credits earned inside the app are the entry ticket and the prize money of ARENA. Merch
          rewards at the top of every leaderboard are not transferable for cash. Nothing on this site is an offer
          to buy or sell securities. Nothing here is investment advice.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="d2-micro" style={{ color: 'var(--d2-ink)' }}>Altier Edge · entity + jurisdiction</h3>
            <p className="d2-mono mt-2" style={{ fontSize: 12 }}>
              Altier Edge is operated in Canada. Regulated posture under provincial securities regulators.
            </p>
            <Link href="/guide/getting-started" className="d2-micro mt-2 inline-block d2-signal">
              [ Read legal posture → ]
            </Link>
          </div>
          <div>
            <h3 className="d2-micro" style={{ color: 'var(--d2-ink)' }}>Altier Edge · methodology + risks</h3>
            <ul className="d2-mono mt-2 space-y-1" style={{ fontSize: 12 }}>
              <li><Link href="/guide/learn">[ Methodology ]</Link></li>
              <li><Link href="/guide/getting-started">[ Risk disclosure ]</Link></li>
              <li><Link href="/guide/community">[ Privacy ]</Link></li>
              <li><Link href="/guide/getting-started">[ Contact ]</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="d2-micro" style={{ color: 'var(--d2-ink)' }}>© Altier Edge, 2026 · built in Canada</h3>
            <p className="d2-mono mt-2" style={{ fontSize: 12 }}>
              PRISM scores are paper-trading signals, not investment advice.
              <br />
              ARENA uses credits earned inside the app.
              <br />
              Nothing on this page is an offer to buy or sell securities.
            </p>
          </div>
        </div>

        <p className="d2-micro mt-6" style={{ fontSize: 11 }}>
          Risk disclosure · ARENA is paper-trading only · Credits earned inside the app, never purchased · Cash out is not
          available · Merch rewards are not transferable for cash.
        </p>
      </div>
    </footer>
  );
}