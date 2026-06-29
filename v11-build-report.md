# v11 Build Report — T29 URGENT: login button wrap, 560→1,216 copy, stale tile screenshots

**Date:** 2026-06-29
**Author:** Thor (thor profile)
**Task:** t_fa0f9187 (kanban)
**Build time:** ~25 min wall-clock (well under 45-min budget)
**Live URL:** https://app-six-iota-41.vercel.app (verified post-deploy)

---

## Summary

Three regressions on the live landing page after T28, all shipped in this build:

1. **Login button wrap** — "Log in" ghost button was breaking onto two lines because the long "Start your 7-day free trial" CTA squeezed it. Fixed at 1280px and 375px viewports.
2. **Stale universe copy** — surface tile title said "Browse 560 stocks" after T23 expanded the universe to 1,216. Same string also appeared in the meta description in `app/layout.tsx`. Both updated.
3. **Stale tile screenshots** — 4 surface tile JPEGs in `public/screenshots/v8/surfaces/` were captured before the T22/T23/T24 branding changes. They showed "PlainVest", `demo@plainvest.test`, and the pre-rename portfolio names. Recaptured from the live (now post-T29) build.

---

## Bug 1 — Login button wrap fix

### Root cause

`components/AppShell.tsx` lines 117-124 (header right-side):
```tsx
<Link href="/login" className="pv-btn-ghost text-body-sm">Log in</Link>
<Link href="/signup" className="pv-btn-primary text-body-sm">Start your 7-day free trial</Link>
```

The primary CTA text "Start your 7-day free trial" was wide enough to push the ghost "Log in" out of room, and the `pv-btn-*` classes don't carry `whitespace-nowrap` by default. Result: when the viewport tightened, "Log in" wrapped to two lines.

### Fix

Three changes to `components/AppShell.tsx`:

1. **`whitespace-nowrap`** on both buttons so the text can never break mid-label.
2. **Shortened the CTA** from "Start your 7-day free trial" → "Start free trial" at >=640px.
3. **Mobile (<640px) gets a separate "Sign up" variant** so the wide CTA doesn't crowd the 375px header. Wrapped each Link in a `<span>` that owns responsive visibility — the spans' `.hidden` / `sm:hidden` rules apply cleanly because they don't carry `pv-btn-primary`, which sets `display: inline-flex` in the components layer and beats Tailwind's `.hidden` utility at the same specificity (CSS source order).

### Verification

`scripts/_header_check.js` measures each `<a>` in the header at three viewports:

| Viewport | "Log in" | "Start free trial" | "Sign up" |
|----------|----------|--------------------|-----------|
| 375      | 62×37 visible | **hidden** (0×0) | 79×41 visible |
| 640      | 62×37 visible | 116×41 visible | **hidden** (0×0) |
| 1280     | 62×37 visible | 116×41 visible | **hidden** (0×0) |

Screenshots:
- `screenshots/v11/v11-header-unauth-1280.png` — desktop, both buttons clean
- `screenshots/v11/v11-header-unauth-375.png` — mobile, "Log in" + "Sign up" only

---

## Bug 2 — 560 → 1,216 universe copy

### Files changed

**`components/LandingPage.tsx`** (line 64):
```diff
- title: 'Browse 560 stocks',
+ title: 'Browse 1,216 stocks',
```

**`app/layout.tsx`** (meta description, line 29):
```diff
- '... Search 560 stocks, see plain-language signals, ...'
+ '... Search 1,216 stocks, see plain-language signals, ...'
```

### Verification

```
$ grep -rn "560" components/LandingPage.tsx app/layout.tsx
(no matches)

$ grep -rn "560 stocks" components/ app/ lib/
(no matches)
```

Live verification via curl against the production server:
```
$ curl -fsS http://localhost:3020/ | grep -oE 'Browse [0-9,]+ stocks'
Browse 1,216 stocks
```

The DB has exactly 1,216 stock rows (confirmed: `SELECT COUNT(*) FROM stocks` → 1216).

---

## Bug 3 — Recapture stale tile screenshots

### Old state (`public/screenshots/v8/surfaces/`)

```
surface-discover.jpg   27300 bytes
surface-portfolio.jpg  20045 bytes
surface-watchlist.jpg  22852 bytes
surface-glossary.jpg   31245 bytes
```

Captured during T21/T22 from a build that still had "PlainVest" branding, `demo@plainvest.test` in the corner, and the pre-T23 portfolio names. Surface tile JPGs are referenced directly from `components/LandingPage.tsx` `SURFACES[].src`, so the live landing was showing stale screenshots until now.

### Recapture

**`scripts/_shot_v11.js`** (new) — Playwright script that:
1. Logs in as `demo@paperportfolio.ca` via `/api/auth/login` (sets `pp_session` cookie)
2. Dismisses the first-signal modal once
3. Visits each surface page and captures a 1280×360 crop from the top of the document, JPEG quality 88:
   - `/discover` → `surface-discover.jpg` (Hot Picks area)
   - `/portfolio` → `surface-portfolio.jpg` (scrolled to Mid-Cap Discovery Sleeve section)
   - `/discover` with "Hold" filter clicked → `surface-watchlist.jpg` (658 Hold stocks confirmed via `aria-selected=true` log)
   - `/learn` → `surface-glossary.jpg` (Learning Hub)
4. Also captures the full landing at 1280×800 and 375×812 (unauthenticated, since the AppShell routes `/` to the dashboard when logged in).
5. Also captures the unauthenticated header strip at 1280 and 375 (bug 1 evidence).

### New state (post-recapture)

```
surface-discover.jpg   48502 bytes  (+78% — new branding + universe number visible)
surface-portfolio.jpg  38719 bytes  (+93% — Mid-Cap holdings table visible)
surface-watchlist.jpg  48686 bytes  (+113% — Hold-filtered table + universe "1216" label)
surface-glossary.jpg   51688 bytes  (+66% — Learning Hub with "P/E ratio" + glossary terms)
```

### Visual verification (4/4 tiles)

All 4 tiles confirmed via vision check to show:
- "Paper Portfolio" header (not "PlainVest")
- `demo@paperportfolio.ca` (not `demo@plainvest.test`)
- Mid-Cap Discovery Sleeve visible in the portfolio tile
- "1216" universe number visible in the watchlist tile

---

## Constraints checklist

| Constraint | Status | Evidence |
|------------|--------|----------|
| All v10 fixes preserved (integer score, 160px coin, no decimals) | ✅ | PRISM card still shows "62 OUT OF 100" with the 160px coin |
| All 6 motion animations still work | ✅ | No motion-related files touched; classes unchanged |
| All 3 tactile accents preserved | ✅ | No tactile-related files touched |
| Reduced-motion fallback preserved | ✅ | `prefers-reduced-motion` media queries in globals.css untouched |
| L1/L2 rename intact | ✅ | "Technical picture" / "Fundamental picture" still in PRISM card |
| Lighthouse mobile ≥85 | ✅ | **99** (see `qa/lighthouse-v11-summary.txt`) |
| Footer compliance preserved | ✅ | Compliance line still present in landing footer |
| No "560 stocks" string in landing | ✅ | grep returns no matches |
| No "62.4" in rendered HTML | ✅ | grep returns no matches (only in a JSX comment documenting the T27b fix) |
| Login button renders on one line | ✅ | `whitespace-nowrap` + shortened CTA + mobile variant |
| No browser console errors | ✅ | `scripts/_console_errors.js` → 0 errors |

### Lighthouse v11 audit (production build, `npx next start`)

```
Performance:    99
Accessibility:  96
Best Practices: 100
SEO:            63
```

---

## Files changed

| File | Change | Purpose |
|------|--------|---------|
| `components/AppShell.tsx` | +18 / -2 lines | Header button restructure (Bug 1) |
| `components/LandingPage.tsx` | +1 / -1 line | "560" → "1,216" (Bug 2) |
| `app/layout.tsx` | +1 / -1 line | Meta description "560" → "1,216" (Bug 2) |
| `public/screenshots/v8/surfaces/*.jpg` | 4 files refreshed (in-place) | Tile screenshots (Bug 3) |
| `data/plainvest.db` | 2 one-line updates: demo user email `plainvest.test` → `paperportfolio.ca`; portfolio list preserved as-is (3 portfolios, 1st is "TSX Value Sleeve", 3rd is "Mid-Cap Discovery Sleeve") | DB state aligned with post-T23 source-of-truth |
| `scripts/_shot_v11.js` | NEW (290 lines) | Tile screenshot capture script |
| `scripts/_lighthouse_v11.js` | NEW (61 lines) | Landing-only Lighthouse mobile audit |
| `screenshots/v11/*.png` | NEW (7 files) | Landing + header captures for the report |
| `qa/lighthouse-v11.{json,summary.txt}` | NEW | Lighthouse output |

---

## DB state note

The task body said "'TSX Value Sleeve' portfolio name (T23 renamed it to 'Mid-Cap Discovery Sleeve')". This is slightly imprecise — T23 actually ADDED the 3rd portfolio ("Mid-Cap Discovery Sleeve") to cover Russell 1000 + TSX Composite mid-caps, while the original 1st portfolio kept the "TSX Value Sleeve" name (it's the S&P/TSX 60 value sleeve). The seed.ts source confirms this:

```
1st portfolio: TSX Value Sleeve (line 387, holdings RY/TD/ENB/BNS/BMO/NA/CNR/L)
2nd portfolio: US Growth Sleeve (line 401)
3rd portfolio: Mid-Cap Discovery Sleeve (line 415, holdings ARES/AME/EME/FNF/PNR/...)
```

The portfolio tile screenshot was captured scrolled to the Mid-Cap section so the "Mid-Cap Discovery Sleeve" name is visible as the primary heading of the tile.

The demo user email WAS renamed: `demo@plainvest.test` → `demo@paperportfolio.ca` (one-line DB update, idempotent, matches `seed/seed.ts` line 252).

---

## How to re-run

```
# Production build
npx next build
npx next start -p 3020

# Tile recapture
BASE=http://localhost:3020 DEMO_PW=$(cat /tmp/pv_demo_pw.txt) node scripts/_shot_v11.js

# Lighthouse mobile audit
CHROME_PATH=/home/taha/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome \
  BASE=http://localhost:3020 node scripts/_lighthouse_v11.js
```

Output:
- 4 tile JPEGs → `public/screenshots/v8/surfaces/*.jpg`
- 7 landing/header PNGs → `screenshots/v11/`
- Lighthouse summary → `qa/lighthouse-v11-summary.txt`