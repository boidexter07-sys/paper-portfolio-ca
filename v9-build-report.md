# v9 Build Report — T27b PRISM card visual fixes

**Task:** t_6f2ddbf4 — URGENT visual bug fix on the PRISM card
**Worker:** Thor (run 148)
**Date:** 2026-06-29

## Bugs fixed

1. **Duplicate "62.4" rendering** — the giant serif number on the right side of the PRISM card collided with the same number inside the PlainScoreCoin on the left.
2. **Eyebrow weight** — the "What is PRISM?" eyebrow was too small/gray and got visually swallowed above the serif H2.

## Choice: Option B

Removed the duplicate giant `<p>62.4</p>` (line 160 of the original T26b). The PlainScoreCoin on the left is the designed visual; letting it own the number is cleaner than a second copy. The "Sample Plain Score" eyebrow + "out of 100 · AAPL · Paper Buy" caption on the right remain, plus the Technical picture / Fundamental picture breakdown cards.

## Eyebrow fix

Created a new `.pv-eyebrow--featured` modifier (scoped to one element, no global impact). Compared to the standard `.pv-eyebrow` (13px stone uppercase tracked), the featured version is:

- 16px (vs 13px) — ~23% larger
- ink color (vs stone gray) — visual weight matches the H2's ink tone
- font-weight 600 (semibold) — carries presence without out-shouting the H2
- sentence-case, slight negative tracking (-0.005em) — same register as the body copy below it

Scoped: only the "What is PRISM?" eyebrow uses `--featured`. All other eyebrows on the page keep `--sentence` so the rest of the visual rhythm is unchanged.

## Files changed

| File | Change |
|---|---|
| `components/LandingPage.tsx` | Eyebrow class `pv-eyebrow--sentence` → `pv-eyebrow--featured` on "What is PRISM?"; removed duplicate `<p className="font-serif text-display text-ink pv-num leading-none">62.4</p>`; added inline T27b comment explaining the removal |
| `app/globals.css` | Added `.pv-eyebrow--featured` modifier block after `.pv-eyebrow--sentence` (lines 291-303) with explanatory comment |

## Verification

- `grep "62\.4" components/LandingPage.tsx` returns 2 hits:
  - Line 155: `<PlainScoreCoin score={62.4} size="lg" />` — data prop feeding the coin (canonical)
  - Line 159: comment text describing the removal
- No other visible "62.4" in the PRISM card section.

## Screenshots

| File | Viewport | Notes |
|---|---|---|
| `screenshots/v9/v9-landing-prism-card-1280.png` | 1280×800 | PRISM card section only, desktop. Coin on left, caption + breakdown on right. |
| `screenshots/v9/v9-landing-prism-card-375.png` | 375×812 | PRISM card section only, mobile. Coin stacks above caption. |
| `screenshots/v9/v9-landing-prism-card-full.png` | 1280×800 | Full landing page. All 5 sections visible. Footer compliance line present. |

## Constraints preserved

- All 6 motion animations: untouched
- All 3 tactile accents (pv-card shadows, pv-coin dual neumorphic shadows, pv-btn pressed state): untouched
- Reduced-motion fallback: untouched
- L1/L2/L3/L4/L5 rename: untouched
- Footer compliance line: visible in full-page screenshot
- Lighthouse mobile ≥85: not re-run (no structural change, only class swap + element removal)

## Server

Production build: `npm run build` ✓ compiled successfully (18/18 static pages).
Server: `npx next start -p 3019` (PID 2079263). Captured screenshots against this server, then left running for any human verification.

## Screenshot script

`scripts/_shot_v9.js` (new) — modeled on `_shot_v8.js`, captures the three v9 screenshots at BASE=http://localhost:3019.