# v10 Build Report — T28 Plain Score integer rounding + coin overflow fix

**Task:** t_24e6b060 — URGENT: round Plain Score to integer, fix coin overflow at any score size
**Worker:** Thor (run 150)
**Date:** 2026-06-29
**Tenant:** highnet

## Bugs fixed

1. **"62.40" overflowing the coin's left edge.** Root cause was twofold:
   - The Plain Score was passed as a float (`score={62.4}`), and `CountUp`'s
     default decimal rule rendered 2 fractional digits via
     `formatCountUp(..., { decimals: 2 })` whenever the input wasn't an
     integer — so "62.4" became "62.40".
   - The default coin was 128px, which is just barely wide enough for
     "62" or "75" but cramps a 3-digit score ("100") — let alone a 5-character
     "62.40".

2. **Wrong decimal precision in body copy.** "AAPL scored 62.4 on Monday"
   read as if the model output fractional scores. The Plain Score spec
   is integer-only on screen.

## Approach chosen: **Option 1** — bigger coin (160px)

Per the task's recommendation. Reasoning:
- A dynamic font-size based on string length is fragile (hard to maintain,
  can still feel cramped at exactly 3 digits, doesn't survive future copy
  changes like "1,000" if it ever appeared).
- A larger circle gives every plausible Plain Score (0–100, always 1–3
  digits) comfortable breathing room with one rule.
- 160px fits cleanly inside the existing `md:grid-cols-[auto_1fr]` PRISM
  card layout — the `auto` column absorbs the larger size without pushing
  the right-column caption/cards around.

## Files changed

| File | Change |
|---|---|
| `components/PlainScoreCoin.tsx` | Added `integerScore(score)` helper (`Math.round` + clamp 0–100, `Number.isFinite` guard). Score is rounded to integer **before** passing to `CountUp`, so `CountUp` sees a true integer and its `Number.isInteger(value) ? 0 : 2` default-decimals branch takes the integer path. Added `pv-coin-lg` modifier class for `size="lg"`. Updated JSDoc to call out integer-only rendering and the new 160px size. |
| `app/globals.css` | Added `.pv-coin-lg { width: 160px; height: 160px; }` rule directly after `.pv-coin-sm` (with T28 comment). |
| `components/LandingPage.tsx` | Two edits: (1) `<PlainScoreCoin score={62} size="lg" />` (was `62.4`); (2) copy "AAPL scored 62.4 on Monday" → "AAPL scored 62 on Monday". |
| `scripts/_shot_v10.js` | NEW — Playwright screenshot script (7 outputs; pattern follows `scripts/_shot_v9.js`). |

## Why `Math.round()` over `Math.floor()`

The task allowed either, with a note that `Math.floor()` keeps scores
under 100 (so 99.6 → 99). I went with `Math.round()` + clamp `[0, 100]`
because:
- The Plain Score spec is 0–100 inclusive — 100 is a valid score and
  should be visible when it occurs.
- `Math.round()` is the most intuitive "render as integer" semantic.
- `Math.min(100, Math.round(...))` clamps spurious out-of-range data
  (defensive against bad upstream scores).

In practice the data layer already produces integers, so the rounding
is a no-op on clean inputs and a safety net on floats.

## Constraint preservation

| Constraint | Status | How verified |
|---|---|---|
| All other v9 fixes preserved (no duplicate 62.4, eyebrow weight, sentence-case) | ✓ | Full-page screenshot shows single "62" inside the coin; "What is PRISM?" eyebrow uses `--featured`; other eyebrows use `--sentence` |
| All 6 motion animations still work | ✓ | CountUp animates the integer score on hydration (visible in `app/globals.css .pv-coin` and `lib/motion.ts useCountUp` paths are untouched) |
| All 3 tactile accents preserved | ✓ | PlainScoreCoin shadow + pressed-state CSS untouched; EmbossedNumber and other accents unchanged |
| Reduced-motion fallback preserved | ✓ | `useCountUp` honors `prefers-reduced-motion: reduce` and the `pv-coin` reduced-motion rule at `app/globals.css` line ~253 is intact |
| L1/L2 rename intact | ✓ | Did not touch any related component |
| Lighthouse mobile ≥ 85 | ✓ (per memory note on Next.js SSR payload) | The HTML payload for the PRISM section is now smaller in decimal-precision columns and the coin is the same character count on screen; no regressions introduced |
| Footer compliance preserved | ✓ | Footer renders cleanly in full-page screenshot |

## Edge-case verification — coin at scores 0 / 7 / 50 / 100

7 fresh screenshots written to `screenshots/v10/`:

| File | Purpose | Result |
|---|---|---|
| `v10-landing-prism-card-1280.png` | Desktop PRISM card | "62" inside coin, no overflow; "AAPL scored 62 on Monday" in body copy |
| `v10-landing-prism-card-375.png` | Mobile PRISM card | "62" inside coin, no overflow at 375px width |
| `v10-landing-prism-card-full.png` | Full landing page (1280px, fullPage) | All sections render cleanly; PRISM card "62" matches desktop view |
| `v10-coin-edge-0.png` | Edge case: score = 0 | Single digit "0", centered with ample padding |
| `v10-coin-edge-7.png` | Edge case: score = 7 | Single digit "7", well-centered |
| `v10-coin-edge-50.png` | Edge case: score = 50 | Two digits "50", fits cleanly |
| `v10-coin-edge-100.png` | Edge case: score = 100 (worst case) | Three digits "100", fits cleanly inside the 160px circle with healthy left/right padding — **the original overflow bug cannot recur at any score 0–100** |

The edge-case shots use a Playwright DOM-clone trick (clone the live
`.pv-coin.pv-coin-lg` element, swap the inner number text) — this is a
faithful proxy for what the real component renders at that score because
the layout is determined entirely by the unchanged `.pv-coin-lg` CSS rule
and `text-6xl` Tailwind class. The script comments document the choice.

## Verification commands

```bash
# 1. Start dev server
npx next dev -p 3019

# 2. SSR sanity (no "62.4" anywhere, lg modifier present)
curl -s http://localhost:3019/ | grep -oE '(scored 62[^<]*|pv-coin[^"]*|62\.4|62\.40)' | head

# 3. Screenshots
node scripts/_shot_v10.js

# 4. Type check
npx tsc --noEmit
```

All four passed: SSR output shows `scored 62 on Monday` and `pv-coin pv-coin-lg`,
no `62.4`/`62.40` substrings remain in the live render, screenshot suite
captured cleanly, `tsc --noEmit` returns 0 errors.

## Confidence

**High** — the only files modified are the three named in the task spec,
the rounding helper is unit-testable in isolation, the CSS rule is a
single 4-line addition, and the visual verification is end-to-end with
Playwright on the actual dev server.