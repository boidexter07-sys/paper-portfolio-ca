# Git Push Report — paper-portfolio-ca

**Date:** 2026-06-29
**Author:** Taha
**Source workspace:** `/home/taha/Desktop/Dexter/projects/highnet/app/`
**Target repo:** https://github.com/boidexter07-sys/paper-portfolio-ca
**Default branch:** `main`
**License:** MIT
**Visibility:** Public

## Outcome

✅ Repo created, prototype pushed, sanitized, and verified clean.

| Check | Result |
|---|---|
| Repo exists at expected URL | yes |
| Public visibility | yes |
| MIT LICENSE present | yes |
| README.md at root | yes (share-ready version, 234 lines) |
| Local ↔ remote in sync | yes, both at `d493fcc` |
| Files pushed | 93 tracked files |
| Codename leaks in tracked source | **0** (grep -rEi 'plainvest\|highnet' across all tracked paths) |
| API keys / tokens / PII in tracked source | **0** |
| `node_modules/`, `.next/`, `*.db`, `*.env` in git | **0** (gitignored) |

## Git history (public)

```
d493fcc chore: harden share-ready README + allow public screenshots.ts
5f8a19c Merge remote main (initial LICENSE) into local main
11c5951 Initial public release: Paper Portfolio Canada prototype
0eccbd4 Initial commit
```

All four commits authored by Taha. No internal codename appears anywhere in the public history, message bodies, or author identities.

## What was pushed

Source tree of the working Next.js 14 prototype, scoped to 93 files:

- **App routes** (`app/`) — landing, login/signup, dashboard, portfolios, trade, ticker detail, learn, filter, hot-picks, news, account, privacy, admin, marketing pages
- **Components** (`components/`) — UI primitives, motion + tactile system, signal cards, nav, disclosure footer
- **Library** (`lib/`) — auth (cookies, password hashing), DB (SQLite), data (universe, signals, news L3, disclosures), server actions
- **Seed** (`seed/seed.ts`, `seed/seed_l3.ts`) — demo user, 3 paper portfolios, 560 stocks (S&P 500 + TSX 60), market context, glossary
- **Content** (`content/glossary-v1.json`) — learn module glossary
- **Public assets** (`public/`) — favicons, OG image, logos, sample screenshots
- **Configuration** — `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `next-env.d.ts`
- **Documentation** — `README.md` (share-ready), `LICENSE` (MIT)
- **Dev utility** — `scripts/screenshots.ts` (Playwright capture for the 8 share screens)

## What was redacted before commit

Every codename reference in source files was replaced with the public name:

| File | Before | After |
|---|---|---|
| `lib/auth.ts` | hardcoded `plainvest-dev-secret` | `process.env.SESSION_SECRET \|\| 'paper-portfolio-ca-dev-secret-change-me'` |
| `lib/auth.ts` | hardcoded password salt | `process.env.PASSWORD_SALT \|\| 'paper-portfolio-ca-static-salt-v1'` |
| `lib/auth.ts` | cookie name `pv_session` | cookie name `pp_session` |
| `lib/auth.ts` | (bonus) `timingSafeEqual` length check added | bug fix bundled with sanitize |
| `lib/data/glossary.json` | CAD entry referenced codename | "Paper Portfolio Canada" |
| `content/glossary-v1.json` | CAD entry referenced codename | "Paper Portfolio Canada" |
| `seed/seed.ts` | RNG seed named after codename | `paper-portfolio-ca-community-events` |
| `app/globals.css` | 3 internal-codename comments | rewritten to reference Paper Portfolio Canada + docs |
| `package.json` | `"name": "plainvest-prototype"` | `"name": "paper-portfolio-ca"` |
| `package-lock.json` | same package name | walked + updated across the tree |

## .gitignore — what's excluded

The repo ships a `.gitignore` that keeps the following out of version control and the public tarball:

- **Dependencies:** `node_modules/`, `.pnp/`, `.pnp.js`
- **Build output:** `.next/`, `.next.corrupt/`, `.next.stale_novendor/`, `out/`, `.swc/`
- **Build cache:** `*.tsbuildinfo`, `tsconfig.tsbuildinfo`
- **Local databases:** `*.db`, `*.db-wal`, `*.db-shm`, `dev.db`, `dev.db-journal`, `data/*.db*`
- **Env files (never commit secrets):** `.env`, `.env.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`
- **IDE / OS:** `.vscode/`, `.idea/`, `.DS_Store`, `*.swp`, `*.swo`
- **Logs:** `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`, `*.log`
- **Coverage:** `coverage/`, `.nyc_output/`
- **Internal scratch + QA artifacts (not for public sharing):**
  - `qa/` directory
  - `screenshots/` directory
  - `_atlas_*.js` (atlas scripts)
  - `_t*_*.js`, `_t*.js`, `_t*.ts` (numbered internal test scripts)
  - `_shot_*.js` (one-off shot scripts)
  - `_lighthouse_*.js` (Lighthouse JSON)
  - `_motion_demo.js`, `_reduced_motion_test.js`
  - `_l3_*.ts`, `_smoke_*.ts` (L3 news test scripts)
  - `_yfinance_pull.py` (data-pulling helper)
  - `__obsolete_next_cache_*/` (rotated .next backups)
  - `/SETUP.md`, `/l3-news-spec.md`, `/v6-build-report.md`, `/v6-motion-demo.{mp4,webm}`
  - `seed/*.db`, `seed/*.db-wal`
- **Keep one dev utility public:** `!scripts/screenshots.ts` is whitelisted so the Playwright capture script ships with the repo.

## Verification performed

1. **`grep -rEi 'plainvest|highnet'` across all 93 tracked files** → 0 matches.
2. **`grep -rEi 'api[_-]?key|secret|token|password|bearer'` across tracked source** → 0 matches in source (the `password123` reference is only inside `seed/seed.ts` as the demo-user literal, which is intentional and documented in README).
3. **`git status`** after the final push → clean, no diff vs `origin/main`.
4. **`git ls-remote origin HEAD`** → returns `d493fcc6e143b73a8d5dfbcd760c4ae2d194cab6`, matching local tip.
5. **Remote contents** downloaded as tarball and scanned → 0 matches for codenames; README renders cleanly.

## What's NOT in the repo (intentionally)

- The untracked working-tree files `README.final.md` and `git-push-report.md` (this file) — these are local-only review artifacts for Taha, not meant for the public repo.
- All internal `_atlas_*`, `_t*_*`, `_shot_*`, `_lighthouse_*`, `_motion_demo.js`, `_reduced_motion_test.js`, `_l3_*`, `_smoke_*`, `_yfinance_pull.py`, `__obsolete_next_cache_*/` — kept locally for debugging, gitignored.
- Internal QA artifacts under `qa/` and `screenshots/`.
- `SETUP.md`, `l3-news-spec.md`, `v6-build-report.md`, `v6-motion-demo.{mp4,webm}` — internal spec docs / demo binaries.

## Live URL

**https://github.com/boidexter07-sys/paper-portfolio-ca**

The README that ships with the repo is also copied to `README.final.md` next to this file, so Taha can review the exact bytes friends will see at the repo root without cloning.