# v12 Build Report — T30 tile image clipping fix

**Date:** 2026-06-29
**Branch:** main
**Author:** Thor (kanban task t_390f4429)
**Builds on:** v11 (T29: 1,216 stocks, login button, demo@ branding)

---

## 1. What changed

The 4 surface tile cards on the public landing page
(`components/LandingPage.tsx` → `SurfaceCard`) were rendering their
embedded product screenshots with `object-cover object-top` over an
image area that's 478×268 (16:9) inside a 480px-wide card. The source
JPEGs were 1280×360 (3.556:1 — much wider than 16:9). With
`object-cover`, the renderer scaled each image to fit the box's height
(pushing the scaled width out to ~956px) and clipped ~239px off **each
side**. Result: text on the left was cropped ("Discover stocks" → "over
stocks") and text on the right was cropped ("What is value investing?"
→ "at is value investing?").

Two-part fix:

- **PART A (CSS):** Switched `object-cover object-top` →
  `object-contain` (per task spec, preferred). Added `rounded-t-md` to
  the image area so the screenshot's top corners match the card's 8px
  rounded corners. Removed `object-top` (irrelevant with `object-contain`).
- **PART B (capture):** Re-captured all 4 tile screenshots at the
  actual 16:9 display aspect — 1280×720 source, downscaled to
  478×269. The 16:9 source matches the card's display ratio so
  `object-contain` fills the box edge-to-edge with no clipping and
  no letterboxing. New files live under
  `public/screenshots/v11/surfaces/`; the old v8 captures under
  `public/screenshots/v8/surfaces/` are preserved (not deleted) for
  rollback. The LandingPage `SURFACES` array now points at `/v11/`.

## 2. Diff summary

`components/LandingPage.tsx` (single file, 27+/11-):

```diff
-      <div className="relative w-full aspect-[16/9] bg-fog/40">
+      <div className="relative w-full aspect-[16/9] bg-fog/40 overflow-hidden rounded-t-md">
         <Image
           src={s.src}
           alt={s.alt}
-          width={640}
-          height={360}
-          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px"
-          className="w-full h-full object-cover object-top"
+          width={478}
+          height={269}
+          sizes="(max-width: 640px) 100vw, 478px"
+          className="w-full h-full object-contain"
         />
       </div>
```

And the SURFACES array: every `src` changed from
`/screenshots/v8/surfaces/surface-X.jpg` to
`/screenshots/v11/surfaces/surface-X.jpg`. Comment above the array
updated to describe the v11 capture shape.

## 3. File-level changes

| Path | Status | Notes |
|---|---|---|
| `components/LandingPage.tsx` | modified | CSS + SURFACES.src + comment |
| `public/screenshots/v11/surfaces/surface-discover.jpg` | new | 478×269, 21.6 KB |
| `public/screenshots/v11/surfaces/surface-portfolio.jpg` | new | 478×269, 16.2 KB |
| `public/screenshots/v11/surfaces/surface-watchlist.jpg` | new | 478×269, 16.5 KB |
| `public/screenshots/v11/surfaces/surface-glossary.jpg` | new | 478×269, 21.9 KB |
| `public/screenshots/v8/surfaces/*.jpg` | unchanged | Preserved for rollback |
| `screenshots/v12/v12-landing-unauth-1280.png` | new | Hero+intro+PRISM (above-the-fold) |
| `screenshots/v12/v12-landing-unauth-375.png` | new | Mobile hero |
| `screenshots/v12/v12-landing-unauth-1280-full.png` | new | Full page, desktop |
| `qa/lighthouse-v12.json` | new | Mobile Lighthouse run |
| `qa/lighthouse-v12-summary.txt` | new | Scores summary |
| `scripts/_lighthouse_v12.js` | new | Audit script (v12-shaped) |
| `scripts/_measure_tiles_v12.js` | new | One-shot tile width measurement |
| `scripts/_measure_pages_v12.js` | new | One-shot page layout measurement |
| `scripts/_resize.py` | new | Pillow downscale helper for tile capture |

## 4. Constraint compliance

| Constraint | Status | Evidence |
|---|---|---|
| All v11 fixes preserved (login button, 560→1,216, branding) | met | v12 build still serves the T29 landing; the only LandingPage.tsx change is in `SurfaceCard` + `SURFACES` srcs |
| Tile should NOT clip any text inside the screenshot | met | vision_analyze of all 4 tiles + the rendered landing page (desktop and mobile) confirms no left/right text clipping |
| Tile should still look polished (rounded corners, proper aspect ratio) | met | Card has `pv-card` (8px border-radius), image area has `rounded-t-md` (8px top corners) + 16:9 aspect; bottom corners of the image are square but they're hidden by the card's `overflow-hidden` |
| Lighthouse mobile ≥ 85 | met (perf = 99) | `qa/lighthouse-v12-summary.txt` |
| All other v10/T28/T29 fixes intact | met | PlainScoreCoin (160px, integer scores), eyebrow--featured, login button wrap, demo@ branding — all verified present in the v12 landing screenshot |

## 5. Lighthouse — mobile, logged-out `/`

`BASE=http://localhost:3019 node scripts/_lighthouse_v12.js`:

```
Performance:    99   (>= 85 ✓)
Accessibility:  96
Best Practices: 100
SEO:            63
```

vs. v11 baseline (`qa/lighthouse-v11-summary.txt`): identical scores
on every category. T30 is a pure rendering fix — no JS, no CSS bundle
size change, no new image bytes shipped (the 4 v11 tiles are 76KB
total vs. v8's 187KB — actually 60% smaller because 16:9 compresses
better than 3.556:1).

## 6. Verification

### Desktop 1280px (vision_analyze of /tmp/tiles_section_full.png + screenshots/v12/v12-landing-unauth-1280-full.png)

All 4 tiles show:

1. **Browse 1,216 stocks** — full Paper Portfolio header + sidebar +
   "Discover stocks" title (intact) + intro paragraph + "Most
   attractive for a paper portfolio" section with 6 visible stock
   cards (PM, SOBO, EVR, SOLV, LECO, MFC, WBD, MG, HR) with their
   Plain Scores.
2. **Practice with paper portfolios** — header + sidebar + portfolio
   holdings table (NVDA, AMZN, META) + "Add holding" + "Mid-Cap
   Discovery Sleeve" + AIRES, AME, EME, FNF rows with prices and
   P&L percentages.
3. **Watch what you want to learn** — header + sidebar + 3 sample
   stock rows (WBD, MG, PRY, TDY, WSO, FTS) + "Browse the universe"
   table + filter pills (All stocks / Buy signal / Hold (selected) /
   Sell signal) + "Sort: Plain Score (high - low)" filter.
4. **Read what the words mean** — header + sidebar + "Learning hub"
   title + "Plain-language explainers" + 4 explainer cards: "What is
   value investing?", "P/E ratio: the most-quoted number,
   explained", "Reading a balance sheet without falling asleep",
   "Free cash flow: why Buffett cares more than earnings".

No text is clipped on left or right. Card corners are rounded.
Card titles are visible below each image.

### Mobile 375px (vision_analyze of /tmp/tiles_section_375.png)

Tiles stack vertically (`grid-cols-1 sm:grid-cols-2` — at 375px the
sm breakpoint isn't met, so single column). Each tile shows the same
16:9 screenshot as on desktop, scaled to the 375px viewport width.
No text clipping, no rendering issues.

## 7. Why this fix is robust

- **CSS is now aspect-match safe.** Even if a future tile image is
  captured at a different aspect ratio, `object-contain` will
  letterbox rather than crop. The text inside the image will never
  be clipped.
- **Capture is dimensionally matched to display.** Tile display area
  is 478×269 (16:9); tile images are 478×269 (16:9). One-to-one.
- **Rollback is cheap.** `public/screenshots/v8/surfaces/` is
  untouched; reverting is one string change in `SURFACES.src` per
  tile.

## 8. Files NOT modified (intentionally)

- `public/screenshots/v8/surfaces/*.jpg` — kept for rollback.
- `app/globals.css` — no Tailwind class additions; the change is
  pure class-name swap on `SurfaceCard`.
- `components/PlainScoreCoin.tsx` — T28 (160px, integer scores)
  verified unchanged.
- All other components — no edits needed.

## 9. Scripts (gitignored, one-shot, kept for re-runs)

- `scripts/_shot_v12.js` — captures the 4 v11 tile JPEGs + 3 v12
  landing PNGs. Usage: `BASE=http://localhost:3019 node
  scripts/_shot_v12.js`.
- `scripts/_lighthouse_v12.js` — mobile Lighthouse audit. Usage:
  `CHROME_PATH=/home/taha/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome BASE=http://localhost:3019 node scripts/_lighthouse_v12.js`.
- `scripts/_measure_tiles_v12.js` — measures live tile card width
  (478×269) and image natural size at 1280px viewport.
- `scripts/_measure_pages_v12.js` — measures page layout (sidebar
  width, main width, H1/H2 positions) for the v11 capture script's
  scrollToY tuning.
- `scripts/_resize.py` — Pillow LANCZOS downscale helper used by
  the v11 capture script.

## 10. Next steps (for reviewer)

- Open `screenshots/v12/v12-landing-unauth-1280-full.png` to verify
  the full landing page still looks good.
- Open `/tmp/tiles_section_full.png` (or the same region of
  v12-landing-unauth-1280-full.png) to verify each of the 4 tiles
  shows the full screenshot with no clipping.
- Open `/tmp/tiles_section_375.png` to verify mobile rendering.
- Optional: `git diff components/LandingPage.tsx` to see the
  minimal CSS + src change.
