// Altier Edge — V12 Concept-First Landing (Build + Play).
// T87 wires the Muse+Nova V12 polish to live `/`, replacing T86's V11 two-area landing.
// Copy: copy/t87-landing-muse-v12/landing-copy.md (Muse V12, locked).
// Visual: design/round-v12-landing-polish/{desktop,mobile}.html (Nova V12, audit-passed).
//
// V12 sequence: Hero → "What's paper trading?" intro → Build card → "What's the challenge?"
// intro → Play card → Parity line → How it works 3+3 → Trust strip → Benefits 3+3 →
// Mid-CTA → Conversion close → Footer.
//
// V11 motion policy carried + extended: Build = NO pulse anywhere (study surface).
// Play = 1.4s pulse on three small pips (Play intro eyebrow pip, area-tag, benefits-col
// head, mid-CTA eyebrow) — same cadence. The first pulse on the page now lives on the
// S4 challenge intro eyebrow pip — the visual cue that the page is about to switch
// from calm to energetic mode.
//
// All copy strings are V12 verbatim. Hero + V11 sections use V11 strings unchanged.
// Brand split: internal codename "HighNet" never escapes; "altier edge" wordmark
// appears lowercase. Banned phrases are absent.

import Link from 'next/link';
import { ConceptIntro } from './ConceptIntro';
import { ParityLine } from './ParityLine';

export function V11Landing() {
  return (
    <div className="v11-landing">
      {/* Gradient mesh atmosphere (v8 retained) */}
      <div className="v11-mesh" aria-hidden="true">
        <div className="v11-mesh-low" />
      </div>

      {/* 1. HERO — V11 Hero A, Build lead, verbatim from landing-copy.md §1 */}
      <section className="v11-hero" id="build" aria-labelledby="v11-hero-h">
        <div className="v11-hero-left">
          <span className="v11-pill">Build your investing know-how. Free.</span>
          <h1 id="v11-hero-h" className="v11-h1">
            Build a virtual portfolio. <span className="v11-coral">Track real stocks.</span> Learn at your pace.
          </h1>
          <p className="v11-lede">
            No real money. No broker. No game clock. Just you, the market, and time to figure it out.
          </p>
          <div className="v11-cta-row">
            <Link href="/signup" className="v11-btn-primary">Start Building</Link>
            <Link href="#how" className="v11-link">See How It Works</Link>
          </div>
        </div>

        <div className="v11-hero-right">
          <HeroScene />
        </div>
      </section>

      {/* 2+3. CONCEPT INTROS + CARDS — V12 sequence.
            On desktop: intros row (2-col) sits ABOVE cards row (2-col), each intro
            column aligned vertically with its card below. The V11 "Two areas, one
            engine / Pick your rhythm. Both free." section header is DROPPED — the
            intros now carry that role, concept-first.
            On mobile: the same children are reordered to interleave intro->card-
            >intro->card->parity via CSS `order`, so each concept label sits tight
            above its card. */}
      <section className="v12-cards-stack" id="cards" aria-label="What each area means and how each card describes it">
        <div className="v12-intros-grid">
          <ConceptIntro variant="paper-trading" />
          <ConceptIntro variant="challenge" />
        </div>

        <div className="v11-areas">
          {/* BUILD CARD — calm tone, deeper navy, desaturated cyan, no pulse */}
          <article className="v11-area-card v11-area-build" aria-labelledby="v11-build-h">
            <div className="v11-area-glyph" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
            <div className="v11-area-tag">Build</div>
            <h3 id="v11-build-h" className="v11-h3">Build</h3>
            <div className="v11-area-sub">Learn investing your way.</div>
            <p className="v11-area-body">
              Build a virtual portfolio with the same stocks the pros watch. Track real market movements. Read PRISM scores. Make mistakes with no money on the line. Take a day, a week, a month — there&apos;s no clock.
            </p>
            <div className="v11-area-inside">What&apos;s inside</div>
            <ul>
              <li>Virtual portfolios you build from scratch</li>
              <li>Real market data, real PRISM scores, no real money</li>
              <li>Learn at your own pace, no daily deadline</li>
            </ul>
            <Link href="/signup" className="v11-area-cta">Start Building</Link>
          </article>

          {/* PLAY CARD — energetic tone, full coral gradient, animated pulse, leaderboard glyph */}
          <article className="v11-area-card v11-area-play" id="play" aria-labelledby="v11-play-h">
            <div className="v11-area-glyph" aria-hidden="true">
              <div className="v11-row r1"><span className="v11-pos">1</span><span className="v11-bar" /><span className="v11-pts">88</span></div>
              <div className="v11-row r2"><span className="v11-pos">2</span><span className="v11-bar" /><span className="v11-pts">71</span></div>
              <div className="v11-row r3"><span className="v11-pos">3</span><span className="v11-bar" /><span className="v11-pts">64</span></div>
            </div>
            <div className="v11-area-tag">Play</div>
            <h3 id="v11-play-h" className="v11-h3">Play</h3>
            <div className="v11-area-sub">Test your read against the field.</div>
            <p className="v11-area-body">
              Today&apos;s game. Pick a stock. Lock your call before the bell. Watch PRISM settle at the close. Climb the leaderboard against friends, your clan, or everyone.
            </p>
            <div className="v11-area-inside">What&apos;s inside</div>
            <ul>
              <li>One game a day, settle at the close</li>
              <li>Lock your read, see the leaderboard move</li>
              <li>Play with friends or the whole field</li>
            </ul>
            <Link href="/signup" className="v11-area-cta">Start Playing</Link>
          </article>
        </div>

        {/* PARITY LINE — V12 NEW. Sits below both cards, single-line pill,
            cyan/coral accents split. The meta-choice now lands in the right
            place — after both areas have been explained by the intros. */}
        <div className="v12-parity-section">
          <ParityLine />
        </div>
      </section>

      {/* 5. HOW IT WORKS — 3+3 visually grouped, two columns (V11 unchanged) */}
      <section className="v11-how" id="how" aria-labelledby="v11-how-h">
        <div className="v11-how-head">
          <div className="v11-how-head-left">
            <div className="v11-eyebrow">How it works</div>
            <h2 id="v11-how-h" className="v11-h2">
              Six steps. <em>Two tracks.</em>
            </h2>
          </div>
          <div className="v11-how-tabs" aria-hidden="true">
            <span className="v11-tab build">Build</span>
            <span className="v11-sep">+</span>
            <span className="v11-tab play">Play</span>
          </div>
        </div>

        <div className="v11-how-grid">
          {/* Build column — steps 1-3 */}
          <div className="v11-how-col build">
            <div className="v11-col-head">
              <span className="v11-col-tag">Build</span>
              <span>3 steps · your pace</span>
            </div>
            <div className="v11-how-step">
              <div className="v11-ix">1</div>
              <div className="v11-step-body">Create your free account.</div>
            </div>
            <div className="v11-how-step">
              <div className="v11-ix">2</div>
              <div className="v11-step-body">Build your first virtual portfolio.</div>
            </div>
            <div className="v11-how-step">
              <div className="v11-ix">3</div>
              <div className="v11-step-body">Track real market movements. Read PRISM.</div>
            </div>
          </div>

          {/* Play column — steps 4-6 */}
          <div className="v11-how-col play">
            <div className="v11-col-head">
              <span className="v11-col-tag">Play</span>
              <span>3 steps · the leaderboard&apos;s pace</span>
            </div>
            <div className="v11-how-step">
              <div className="v11-ix">4</div>
              <div className="v11-step-body">Pick today&apos;s game. Lock your read.</div>
            </div>
            <div className="v11-how-step">
              <div className="v11-ix">5</div>
              <div className="v11-step-body">Settle at the close. See where you landed.</div>
            </div>
            <div className="v11-how-step">
              <div className="v11-ix">6</div>
              <div className="v11-step-body">Climb the leaderboard. Play again tomorrow.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRUST STRIP — 4 lines, last = parity moment (V11 unchanged) */}
      <section className="v11-trust" aria-labelledby="v11-trust-h">
        <h2 id="v11-trust-h" className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>How we teach</h2>
        <div className="v11-trust-panel">
          <div className="v11-trust-line lead">
            <div className="v11-mark" aria-hidden="true">✓</div>
            <div>Learn investing the way it should be.</div>
          </div>
          <div className="v11-trust-line no">
            <div className="v11-mark" aria-hidden="true">✕</div>
            <div>Not through confusing textbooks.</div>
          </div>
          <div className="v11-trust-line no">
            <div className="v11-mark" aria-hidden="true">✕</div>
            <div>Not through expensive courses.</div>
          </div>
          <div className="v11-trust-line parity">
            <div className="v11-mark" aria-hidden="true">↔</div>
            <div>
              Learn by doing — <strong className="build">your pace</strong>, or <strong className="play">the leaderboard&apos;s pace</strong>. Your call.
            </div>
          </div>
        </div>
      </section>

      {/* 7. BENEFITS — 3+3 split, not 6 mixed (V11 unchanged) */}
      <section className="v11-benefits" aria-labelledby="v11-benefits-h">
        <div className="v11-eyebrow">Why it works</div>
        <h2 id="v11-benefits-h" className="v11-h2">
          Real data. <em>No risk.</em> Your choice.
        </h2>

        <div className="v11-ben-grid">
          <div className="v11-ben-col build">
            <div className="v11-col-head">Build benefits</div>
            <h4>The track that meets you where you are.</h4>
            <div className="v11-ben-item">
              <div className="v11-check" aria-hidden="true">✓</div>
              <div>Build a virtual portfolio from any real stock</div>
            </div>
            <div className="v11-ben-item">
              <div className="v11-check" aria-hidden="true">✓</div>
              <div>Track real market data — no fake numbers, no lag</div>
            </div>
            <div className="v11-ben-item">
              <div className="v11-check" aria-hidden="true">✓</div>
              <div>Read PRISM scores that explain themselves, no jargon</div>
            </div>
          </div>
          <div className="v11-ben-col play">
            <div className="v11-col-head">Play benefits</div>
            <h4>The track that shows up every morning.</h4>
            <div className="v11-ben-item">
              <div className="v11-check" aria-hidden="true">✓</div>
              <div>One game a day, one leaderboard, one close</div>
            </div>
            <div className="v11-ben-item">
              <div className="v11-check" aria-hidden="true">✓</div>
              <div>Play with friends or the whole field</div>
            </div>
            <div className="v11-ben-item">
              <div className="v11-check" aria-hidden="true">✓</div>
              <div>Build a streak, watch your reads improve</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. MID-CTA BANNER — Play lead (the OTHER area since hero led with Build) (V11 unchanged) */}
      <section className="v11-cta-mid" aria-labelledby="v11-mid-h">
        <div className="v11-cta-mid-panel">
          <div className="v11-eyebrow-light">Today&apos;s game</div>
          <h2 id="v11-mid-h">
            Lock your call. <em>See how you read.</em>
          </h2>
          <p className="v11-body">
            One stock a day. Settle at the close. Climb the leaderboard. No real money. No broker.
          </p>
          <Link href="/signup" className="v11-btn-on-coral">Start Playing</Link>
        </div>
      </section>

      {/* 9. CONVERSION CLOSE — both areas, two CTAs (V11 unchanged) */}
      <section className="v11-cta-final" aria-labelledby="v11-final-h">
        <div className="v11-cta-final-panel">
          <div className="v11-eyebrow">Both areas, one account</div>
          <h2 id="v11-final-h">
            Build it your way. <em>Play it daily.</em> Both free.
          </h2>
          <p className="v11-body">
            altier edge is a virtual portfolio you build at your pace AND a daily game you can play when you want. No real money either way. Pick the one you want to start with — you can switch any time.
          </p>
          <div className="v11-cta-row">
            <Link href="/signup" className="v11-btn-primary">Start Building</Link>
            <Link href="/signup" className="v11-btn-ghost-cyan">Start Playing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------- 3D card hero scene --------------------
   Build-led hero: cards read as a study surface. Static "Settled" pips (not blinking),
   "Paper" tags, no float animation, no LIVE/blink. The visual tone of Build (calm,
   persistent) carries into the hero scene. */
function HeroScene() {
  return (
    <div className="v11-scene">
      <SceneCard cls="c1" chip="PRISM · ENERGY" big="ENB" name="Enbridge · 1d" prism={55} />
      <SceneCard cls="c2" chip="PRISM · BANK"   big="RY"  name="Royal Bank · 1d" prism={68} />
      <SceneCard cls="c3" chip="PRISM · SHOP"   big="SHOP" name="Shopify · 1d"   prism={72} />
      <SceneCard cls="c4" chip="PRISM · FINTECH" big="SQ"  name="Block · 1d"     prism={61} />
    </div>
  );
}

function SceneCard({ cls, chip, big, name, prism }: {
  cls: string; chip: string; big: string; name: string; prism: number;
}) {
  return (
    <div className={`v11-card3d ${cls}`}>
      <div className="v11-card3d-top">
        <div className="v11-card3d-chip">{chip}</div>
        <div className="v11-card3d-settled">Settled</div>
      </div>
      <div>
        <div className="v11-card3d-big">{big}</div>
        <div className="v11-card3d-name">{name}</div>
      </div>
      <div className="v11-card3d-bottom">
        <div>
          <div className="v11-card3d-prism">PRISM</div>
          <div className="v11-card3d-prism-val">{prism}</div>
        </div>
        <div className="v11-card3d-tag">Paper</div>
      </div>
    </div>
  );
}
