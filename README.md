# Paper Portfolio Canada

A paper-trading learning platform. Practice reading stocks with paper portfolios, see plain-language signals on ~560 names (S&P 500 + TSX 60, with Russell 1000 and the TSX Composite now wired up too), and learn the words. **Nothing here is investment advice.**

This repository contains the working Next.js 14 prototype: every screen, the paper-trading flow, the PRISM score, the News & Sentiment layer, the Learning Hub, the Community feed, and the seven-day free trial. The codebase started as a private prototype and is being published so other adults 18+ (in Canada) can try the experience.

## Who this is for

Adults who want to learn how to read a stock and practice with paper portfolios. Built for Canadians first: prices and disclosures default to CAD, the age gate confirms 18+ and Canadian residency, and the data universe includes S&P 500, TSX 60, Russell 1000, and the TSX Composite.

This is **not** for anyone looking for a brokerage, a real-money trading app, financial advice, or a guaranteed-return product. There is no real brokerage here, no real money, and no connection to any real trading venue.

## Features

Things you can try in the running app:

- **Browse ~560 stocks** — S&P 500, TSX 60, Russell 1000, and the TSX Composite. Search by ticker, filter by sector, sort by signal.
- **PRISM Plain Score (0–100)** — A plain-language score per stock, blending the technical picture (price action) and the fundamental picture (P/E, P/B, ROE, market cap, dividend yield, 52-week range). Each card explains every number.
- **Paper Buy / Paper Sell** — Practice trades with no real money. The portfolio updates instantly and shows paper P&L (simulated gains, not real money).
- **Discover filter + Hot Picks** — Filter the universe by PRISM signal (Paper Buy / Hold / Paper Sell) and surface the names with the most attention from the community.
- **News & Sentiment (L3 layer)** — A blended 0–100 daily sentiment score built from NewsAPI headlines, GDELT events, Reddit mentions, and SEC EDGAR filings. Every score links back to the source headline.
- **Learning Hub + 100-term glossary** — Plain-language explanations of the words you will see on every stock page. Click any underlined term to read its entry.
- **Community feed** — An anonymized feed of paper trades and watchlist activity from other learners. Not advice — just signals that other people are paying attention.
- **Watchlist** — A short list of names you want to track. PRISM scores refresh on each visit (15-minute TTL on EDGAR, 1-hour TTL on news/GDELT, 6-hour TTL on Reddit).
- **7-day free trial** — Full access during the trial, no automatic charges, cancel anytime. Reminders on day 5, 6, and 7.
- **Account settings** — Delete your account and all your data at any time.

## Tech

- **Next.js 14** (App Router, server components)
- **React 18 + TypeScript**
- **Tailwind CSS** with a custom paper / ink / muted-ochre palette
- **better-sqlite3** for the local SQLite database
- **Recharts** for the price-history chart
- **NewsAPI, GDELT, Reddit (no-auth JSON), SEC EDGAR** for the L3 news & sentiment layer

## Demo login

A demo account is seeded for visitors who want to poke around without signing up:

- **Email:** `demo@paperportfolio.ca`
- **Password:** `password123`

The demo user has a 7-day trial that started two days ago, one paper portfolio with a few sample holdings, a populated watchlist, and a community feed. All trades are paper trades.

> **Note:** the demo email is intentionally a `.ca` domain rather than a `.test` or `.local` TLD, so it is recognizable as a Canadian demo account. The password is a public demo credential — do not reuse it for any real account.

## Quick start

```bash
# 1. Install
npm install

# 2. Seed the demo data (creates ./data/paperportfolio.db and inserts demo@paperportfolio.ca)
npm run seed
npm run seed:l3

# 3. Run the dev server
npm run dev
# → http://localhost:3000
```

Then either log in with the demo credentials above, or create a fresh account from `/signup`.

### Optional: live news & sentiment

The L3 news layer works out of the box with GDELT, Reddit, and SEC EDGAR (no API keys required). NewsAPI is optional — set `NEWS_API_KEY` in `.env.local` if you want NewsAPI headlines blended in. Without it, the GDELT + Reddit + EDGAR blend still produces a usable daily sentiment score.

```bash
# .env.local (optional)
NEWS_API_KEY=<your-newsapi-key-here>
SEC_USER_AGENT="Your Name research/1.0 (contact: you@example.com)"
```

The default EDGAR user agent is set to a generic research label — please override it with your own contact info before deploying anywhere.

## Project structure

```
app/                  # Next.js App Router pages and API routes
  api/                # auth + trade + community endpoints
  account/            # account settings, delete account
  community/          # anonymized paper-trade feed
  discover/           # universe table + Hot Picks
  learn/              # Learning Hub + glossary
  login/              # log in
  logout/             # log out
  portfolio/          # paper portfolio detail
  signup/             # sign up + age gate
  stock/[ticker]/     # PRISM card, deep stats, news & sentiment
components/           # shared React components (AppShell, Footer, PRISM card, etc.)
content/              # glossary source JSON
lib/                  # auth, db, PRISM scoring, ingestion pipeline, disclosures
public/               # static assets
seed/                 # demo data seed scripts
```

## Privacy and data

This prototype stores everything locally in a SQLite file at `./data/paperportfolio.db`. No data is sent to any server other than the third-party news, GDELT, Reddit, and EDGAR endpoints used to refresh PRISM and sentiment scores.

The prototype collects the minimum needed to run: your email, your investing-style preference, your paper portfolio, and your watchlist. It never collects real brokerage credentials, real trade history, or government ID. You can delete your account and all your data from `/account` at any time.

## Important disclaimers

**This is not investment advice.** Paper Portfolio Canada is an educational tool. All trades are paper trades. The PRISM score and the News & Sentiment layer are produced by algorithms that look at public data. Past patterns do not predict future results. Talk to a registered advisor before making real investment decisions.

**You must be 18+ and a resident of Canada** to create an account. The age gate is enforced at sign-up. We do not collect government ID and we do not verify age against any external source — this is a self-attestation.

**No real brokerage, no real money, no real trades.** This prototype does not connect to any real brokerage. The Paper P&L you see is simulated.

**No warranty.** This is a prototype. The data may be wrong, incomplete, or stale. The interface may break. Use it for learning, not for any financial decision.

## License

MIT — see `LICENSE`.

## Author

Built by **Taha**. The prototype was assembled in a series of focused sprints — motion grammar, News & Sentiment (L3), Russell 1000 + TSX Composite expansion, the Learning Hub, Discover filters and Hot Picks — and is now published as a shareable starting point for other adults who want to learn how to read a stock.

## Acknowledgements

- **SEC EDGAR** — public company filings.
- **GDELT Project** — global event / tone data.
- **NewsAPI** — news headlines (optional API key).
- **Reddit** — public subreddit `.json` endpoints, no auth.
- **Stooq / Yahoo Finance** style CSV endpoints used for offline price history during seeding.

This project is not affiliated with, endorsed by, or sponsored by any of the data providers above.