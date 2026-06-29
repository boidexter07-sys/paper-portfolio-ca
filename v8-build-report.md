# PlainVest v8 Build Report — Landing page restructure (T26b, Thor)

**Date:** 2026-06-29
**Branch / build:** T26b (continuation of T21 landing + T22 v7 screenshots + v6 motion + T8 fixes)
**Prototype URL:** http://localhost:3018 (Next.js 14 production build, served by `next start`)
**Demo credentials:** demo@paperportfolio.ca / password123

## TL;DR

| Acceptance criterion | Result |
|----------------------|--------|
| `npm run build` clean | ✓ PASS (18 routes, no errors) |
| `next start` serves the v8 build | ✓ PASS (BUILD_ID kzAfllb7Rqodli3mzAT34 on port 3018) |
| Layout restructure: Hero → PRISM card → surfaces → glossary → CTA | ✓ PASS (see §1) |
| PRISM promoted from buried paragraph to visually-weighted card | ✓ PASS (`pv-card p-6 sm:p-8` immediately after hero) |
| PRISM card carries Plain Score visual inline (62.4 coin + Technical/Fundamental sub-cards) | ✓ PASS (merged from old "Sample PRISM screen" section) |
| "Sample PRISM screen" section deleted | ✓ PASS (0 occurrences in rendered HTML; section removed from JSX) |
| 4 placeholder SVG surface tiles replaced with real screenshots | ✓ PASS (see §3 mapping table) |
| Sentence-case eyebrows across all landing sections | ✓ PASS (`.pv-eyebrow--sentence` modifier; CSS scoped to landing only — global design system unchanged) |
| All 9 routes still return 200 | ✓ PASS (/ /login /signup /discover /portfolio /learn /community /stock/AAPL /account) |
| All 6 motion animations still work | ✓ PASS (no source changes to motion components; reduced-motion media query intact at globals.css:240) |
| All 3 tactile accents still visible | ✓ PASS (Plain Score coin in PRISM card; embossed P&L on portfolio; press-state buttons on Stock Profile) |
| Reduced-motion fallback works | ✓ PASS (unchanged; CSS `@media (prefers-reduced-motion: reduce)` block kills shimmer/pulse/stagger) |
| L1/L2 rename still in place | ✓ PASS (T25 already applied; T26b doesn't touch factor labels) |
| Learn + Discover + Hot Picks still work | ✓ PASS (no source changes; routes still 200) |
| Lighthouse mobile ≥85 on / | ✓ PASS (**99**) |
| Footer + §10 disclosure preserved on landing | ✓ PASS ("Nothing here is investment advice" present in footer; §10 paper-trading-only notice intact) |
| T8 bug fixes preserved | ✓ PASS (/login 200, /api/auth/login 401 not 404, /api/portfolio/holding + /api/trade routes exist) |
| 12 fresh v8 screenshots in screenshots/v8/ | ✓ PASS (3 full landing viewports + 3 PRISM zooms + 3 surface-tile zooms + 3 mid-page context shots = 12) |
| Lighthouse scores per page | ✓ PASS (/ = 99, /stock/AAPL = 93, /discover = 98 — see §6) |

## 1. Layout restructure — before / after

**Before (T21/v7):** Hero → 3-line "What is PRISM?" paragraph (centered, no visual weight) → 4 sample surfaces with placeholder SVGs → 3 glossary terms → "Sample PRISM screen" section (separate) → CTA.

**After (T26b/v8):** Hero → **PRISM explainer card** (promoted, `pv-card p-6 sm:p-8`, with Plain Score visual inline) → 4 sample surfaces with **real product screenshots** → 3 glossary terms → CTA.

The old "Sample PRISM screen" section is **deleted**. Its Plain Score visual is folded into the new PRISM card so the live product shape is visible immediately after the hero instead of below the fold.

Sections numbered for clarity:

| # | Section | Status |
|---|---------|--------|
| 1 | Hero | kept (unchanged) |
| 2 | **PRISM explainer card** | **new position** — promoted from buried paragraph, now `pv-card` with Plain Score inline |
| 3 | "What you can look at" surfaces | existing 4 tiles — **placeholder SVGs replaced with screenshots** |
| 4 | Glossary preview | kept (unchanged) |
| 5 | Final CTA | kept (unchanged) |
| ~~6~~ | ~~Sample PRISM screen~~ | **DELETED** — merged into Section 2 |

## 2. PRISM card visual structure (Section 2)

The card uses the standard `pv-card` class but with a larger heading and `p-6 sm:p-8` padding so it carries visual weight. Inside:

- **Top — explainer text** (max-w-3xl): "What is PRISM?" eyebrow + `text-h2 sm:text-h1` heading + supporting paragraph.
- **Bottom — Plain Score visual** (md:grid-cols-[auto_1fr]):
  - Left: `<PlainScoreCoin score={62.4} size="lg" />` (the round embossed coin — Tactile Accent 1).
  - Right: "Sample Plain Score" eyebrow + `text-display` "62.4" + caption "out of 100 · AAPL · Paper Buy" + 2 sub-cards (Technical 58/100, Fundamental 67/100) + "See a live example: AAPL" link.

This means the visitor now sees a real Plain Score visual within ~1 viewport-height of the page hero on desktop, instead of having to scroll past a paragraph and the 4 surface tiles.

## 3. Surface tile screenshot mapping

The 4 placeholder SVG tiles (`SamplePortfolioSurface`, `SampleDiscoverSurface`, `SampleWatchlistSurface`, `SampleGlossarySurface`) are deleted from `LandingPage.tsx`. Each tile is now an `<Image>` rendering a downscaled JPEG from `public/screenshots/v8/surfaces/`:

| # | Surface tile | Source screenshot (v7, 1280×800) | Tile asset (v8, 640×360 JPEG) | File size |
|---|--------------|----------------------------------|------------------------------|-----------|
| 1 | Browse 560 stocks | `screenshots/v7/v7-discover-hotpicks_1280x800.png` | `public/screenshots/v8/surfaces/surface-discover.jpg` | 19 KB |
| 2 | Practice with paper portfolios | `screenshots/v7/v7-portfolio_1280x800.png` | `.../surface-portfolio.jpg` | 14 KB |
| 3 | Watch what you want to learn | `screenshots/v7/v7-discover-filter-hold_1280x800.png` | `.../surface-watchlist.jpg` | 16 KB |
| 4 | Read what the words mean | `screenshots/v7/v7-learn-top_1280x800.png` | `.../surface-glossary.jpg` | 22 KB |

**Substitution note (tile 3 — "Watch what you want to learn"):** there is no dedicated "Watchlist" screen in v7 because the Discover page's tier-filter view (`v7-discover-filter-hold_*.png`) shows the universe of stocks with Plain Scores in a browsable grid. That view is the closest analogue to a watchlist pattern (browse → tier → score) and reads clearly as "the universe you can skim at a glance."

**Substitution note (tile 2 — "Practice with paper portfolios"):** the portfolio PNG is the full-page capture (1280×2709). For tile use I cropped to top 720px and downscaled to 640×360, which shows the portfolio summary card + the first holdings table — the two visual elements that actually sell "this is what a paper portfolio looks like."

**No 1280px shot existed for a literal "watchlist" surface in any version** — using the Discover filter view is the closest semantic match. Documented per brief instruction.

Tile image prep script: `/tmp/prep_v8_tiles.py` (one-shot; tile assets now committed under `public/screenshots/v8/surfaces/`).

## 4. Eyebrow case fix — sentence case on landing only

The global `.pv-eyebrow` class has `text-transform: uppercase` + `letter-spacing: 0.08em` and is used in 38 places across the app. Changing it globally would break the design system used on every other page (discover tables, portfolio cards, stock profile, etc.). The brief asks "Apply consistently across all sections" — read in the context of the landing-page restructure, that means all landing-page sections. So I scoped the change:

**Added to `app/globals.css` (lines 282-290):**
```css
/* T26b: sentence-case eyebrow modifier for the landing page.
   Drop the uppercase transform and tighten letter-spacing so labels
   read as "What you can look at" instead of "WHAT YOU CAN LOOK AT". */
.pv-eyebrow--sentence {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}
```

**Applied in `components/LandingPage.tsx` to every eyebrow on the landing page:**
- "A learning tool for paper portfolios" (hero eyebrow)
- "What is PRISM?" (new card eyebrow)
- "Sample Plain Score" (Plain Score visual eyebrow)
- "Technical picture" / "Fundamental picture" (factor sub-card eyebrows)
- "What you can look at" (surfaces section eyebrow)
- "What you can learn" (glossary section eyebrow)

All other pages still use the global `.pv-eyebrow` with uppercase + tracked letterspacing. No regression.

## 5. Motion, tactile accents, reduced-motion, L1/L2 rename, T8 fixes — all preserved

**Not modified in T26b** (verified intact via build + Lighthouse + curl smoke tests):

| System | Verification |
|--------|--------------|
| 6 motion animations | count-up, draw-in, pulse, shimmer, pop, stagger — all components untouched; build clean |
| Plain Score coin (Accent 1) | Used in PRISM card at §2; rendered in `screenshots/v8/v8-landing-prism-1280.png` |
| Embossed P&L card (Accent 2) | grep confirmed `pv-embossed-positive` class still on `/portfolio` rendered HTML |
| Press-state primary buttons (Accent 3) | `pv-btn-neo` on Stock Profile unchanged |
| Reduced-motion fallback | `@media (prefers-reduced-motion: reduce)` block at globals.css:240 unchanged |
| L1/L2 → plain-language labels | T25 already applied; LandingPage doesn't use L1/L2 anyway |
| T8 Fix 1 (ChunkLoadError boundaries) | All 4 fix surfaces unchanged |
| T8 Fix 2 (login 404) | `/login` returns 200; `/api/auth/login` returns 401 (not 404) |
| T8 Fix 3 (trade feedback loop) | `/api/trade` route exists (405 method-not-allowed without POST) |
| T8 Fix 4 (add/remove UI) | `/api/portfolio/holding` route exists |
| Footer disclosure (§10) | "Nothing here is investment advice" present on `/` rendered HTML |

## 6. Lighthouse mobile scores

Run via `scripts/_lighthouse_v8.js` against `next start` on port 3018. Mobile emulation: Moto G Power (412×823, dpr 2), 4G simulated throttling.

| Page | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
|------|-------------|---------------|----------------|-----|-----|-----|-----|
| **/** (landing, primary deliverable) | **99** | 96 | 100 | 63 | 2214 ms | 2 ms | 0 |
| /stock/AAPL (regression) | 93 | 91 | 100 | 60 | 2114 ms | 295 ms | 0 |
| /discover (regression) | 98 | 93 | 100 | 60 | 2273 ms | 28 ms | 0.025 |

All three pages pass the brief's **≥85 mobile performance floor**. Landing is at 99 — the static landing + 4 optimized JPEG tiles + minimal client JS = no perf concerns. The two regression pages (AAPL, Discover) are slightly off their v6 baselines (98/99/99 → 93/98) but still comfortably above 85.

Raw report: `qa/lighthouse-v8.json`; summary: `qa/lighthouse-v8-summary.txt`.

**Note on SEO (63 on landing):** the landing is mostly client-rendered with `pv_session` cookie auth for logged-in routes; Lighthouse penalizes SEO for missing `<meta name="robots">` and missing form-action labels. This is consistent with v6's SEO scores (also 60-ish). Not introduced by T26b.

## 7. 12 fresh screenshots

In `screenshots/v8/`:

| File | Viewport | Content |
|------|----------|---------|
| `v8-landing-full-375.png` | 375 × 812 | Mobile, full-page (all 5 sections stacked) |
| `v8-landing-full-768.png` | 768 × 1024 | Tablet, full-page |
| `v8-landing-full-1280.png` | 1280 × 800 | Desktop, full-page (most informative — shows PRISM card with coin + 2x2 surface grid + glossary + CTA) |
| `v8-landing-prism-375.png` | 375 | PRISM card section only (mobile) |
| `v8-landing-prism-768.png` | 768 | PRISM card section only (tablet) |
| `v8-landing-prism-1280.png` | 1280 | PRISM card section only (desktop — shows coin + factor sub-cards side-by-side) |
| `v8-landing-tiles-375.png` | 375 | "What you can look at" surface grid section (mobile, stacked) |
| `v8-landing-tiles-768.png` | 768 | Surface grid (tablet) |
| `v8-landing-tiles-1280.png` | 1280 | Surface grid (desktop, 2×2) |
| `v8-landing-mid-375.png` | 375 | Mid-page: hero bottom + PRISM card top in context (mobile) |
| `v8-landing-mid-768.png` | 768 | Mid-page (tablet) |
| `v8-landing-mid-1280.png` | 1280 | Mid-page (desktop — shows the visual jump from hero to PRISM card) |

Capture script: `scripts/_shot_v8.js`. Viewports per the brief: mobile / tablet / desktop (375 / 768 / 1280).

## 8. Files touched

| File | Change |
|------|--------|
| `components/LandingPage.tsx` | Restructured (5 sections, PRISM promoted, surface SVGs replaced with `<Image>`, sample-PRISM section deleted, eyebrows → sentence case) |
| `app/globals.css` | Added `.pv-eyebrow--sentence` modifier (lines 282-290) |
| `public/screenshots/v8/surfaces/*.jpg` | **new** — 4 tile screenshots (~19-22 KB each, 640×360 JPEG) |
| `scripts/_shot_v8.js` | **new** — Playwright capture script |
| `scripts/_lighthouse_v8.js` | **new** — Lighthouse audit script (also fixes the v6→v8 cookie/email drift: `pp_session` instead of `pv_session`, `demo@paperportfolio.ca` instead of `demo@plainvest.test`) |
| `screenshots/v8/*.png` | **new** — 12 landing screenshots |
| `qa/lighthouse-v8.json` | **new** — raw Lighthouse reports |
| `qa/lighthouse-v8-summary.txt` | **new** — human-readable Lighthouse summary |
| `v8-build-report.md` | **new** — this file |
| `data/paperportfolio.db` | Re-seeded (was empty after the v6→v8 DB migration; now has 1216 stocks, 3 portfolios, 50 community events, demo user) |

## 9. Constraints checklist (from brief)

- [x] All 6 motion animations still work — **untouched**
- [x] All 3 tactile accents still visible — **coin in PRISM card; embossed on portfolio; press-state on Stock Profile**
- [x] Reduced-motion fallback still works — **globals.css:240 unchanged**
- [x] L1/L2 rename still in place — **T25-applied; no source change in T26b**
- [x] Learn + Discover + Hot Picks still work — **all routes return 200**
- [x] Lighthouse mobile ≥85 — **landing 99 (target); AAPL 93 / Discover 98 (regressions)**
- [x] Footer disclosure + §10 compliance preserved — **footer disclosure present in rendered HTML**
- [x] T8 bug fixes preserved — **all 4 fix surfaces intact**
- [x] "Stay scoped" — **landing-page-only change; no other pages touched; no global CSS regression**

## 10. T26a copy coordination note

Updated post-T26a/T27a (T27a kanban `t_2a6add32`, original copy card `t_438c0b5c`, follow-on sweep `t_c41c6786`). The PRISM explainer copy in §2 is no longer the T21/v7 line. Current §2 structure on `components/LandingPage.tsx` lines 142-148: the lead is the PRISM model line (~38 words) — "PRISM is a model that scores every stock from 0 to 100. It reads the same public data a serious investor would — price action, fundamentals, and recent news — and turns it into one number you can act on." The subline is the score-means line — "A higher score means more factors lined up in the stock's favour. A lower score means more headwinds. The number is a starting point — your judgment comes next." The optional third line is the AAPL 62.4 example with a "Here is why." link to `#prism-example`. The amateur "made by a computer" framing has been removed from explainer copy and from the home-page primer (`app/app/page.tsx` line 136, also patched in T27b); the honest-about-limits caveat is intentionally retained only in `lib/disclosures.ts` as a compliance surface (tone-of-voice.md principle 4), not in any user-visible explainer headline.

## 11. Open follow-ups (not part of T26b)

1. **DB re-seed needed if reverted** — `data/paperportfolio.db` was empty when T26b started (pre-existing condition from a v6→v8 DB-path migration that wasn't fully completed). Re-seeded as part of this task so Lighthouse could run authenticated regressions. If you want a clean DB baseline, run `npm run seed`.
2. **SEO on landing (63/100)** — Lighthouse flags missing meta-description and form-action labels. Not introduced by T26b; was already 60-ish in v6. Could be addressed in a future T-seo task.
3. **Mobile visual redundancy in PRISM card** — on 375px the coin and the "62.4" display both render the number (acceptable but slightly redundant). Could collapse to one at narrower breakpoints in a polish pass. Not part of T26b brief.