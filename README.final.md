# Paper Portfolio Canada

> **A paper-trading learning platform. Practice reading stocks with paper portfolios. Nothing here is investment advice.**

Paper Portfolio Canada is a small, self-contained web app for learning how to read stocks without risking real money. You sign up, get three pre-seeded paper portfolios, search 560+ Canadian and US stocks, see plain-language signals, and try paper Buy / Sell trades that update your simulated portfolio. Every signal and every trade screen reminds you that this is for learning only.

Built with Next.js 14 + React + TypeScript + SQLite. Runs entirely on your laptop — no cloud account, no real brokerage, no API keys required.

---

## ⚠️ Please read first

- **This is not investment advice.** Paper Portfolio Canada is an educational tool. Signals are produced by an algorithm that looks at public data; past patterns do not predict future results.
- **You must be 18 or older** and live in Canada to use the app.
- **All trades are paper trades.** No real money moves. We do not connect to any real brokerage.
- **Data lives on your machine.** Your email, your paper portfolio, your watchlist — all stored in a local SQLite database. You can delete everything from Account → Privacy.
- **No API keys or paid services are required.** Stock prices are pulled live from `yfinance` if Python is installed; otherwise the seed uses deterministic synthetic data so the charts still work.

The age gate and not-advice disclaimers appear at signup, on every signal card, and in the footer of every page.

---

## Try the demo (3 commands)

```bash
npm install        # ~20 seconds
npm run seed       # creates a demo user + 3 paper portfolios + 560 stocks
npm run dev        # http://localhost:3000
```

Then open <http://localhost:3000> and click **Log in**. The seed creates a demo account for you:

```
email:    demo@paperportfolio.ca
password: password123
```

The first time you land on a page that shows signals, a small disclosure modal explains what PRISM signals are and aren't. Click through once and it won't appear again.

---

## What you can do with it

| Where to go | What to try |
|---|---|
| **Home dashboard** `/` | See your three paper portfolios at a glance, with three featured stocks and a feed of recent anonymised community paper-trades. |
| **Stock discovery** `/discover` | Search and sort all 560 stocks (S&P 500 + TSX 60). Filter by exchange, sector, or market cap. |
| **Stock profile** `/stock/[ticker]` | Open any stock (try `AAPL`, `SHOP`, `RY`, `TD`, `ENB`). See the Plain Score card, the price chart, plain-language factor breakdown, and the paper Buy / Sell buttons. |
| **Stock deep dive** `/stock/[ticker]/deep` | Tap "Deep dive" for the full Technical + Fundamental + News & sentiment breakdown with plain-English factor explainers. |
| **Paper portfolio** `/portfolio` | Watch your simulated positions and P&L. The number is big and the label is loud: *"Paper P&L — simulated gains, not real money."* |
| **Learning Hub** `/learn` | 12-term working glossary, article outlines, and a plain "this isn't advice" note. |
| **Account** `/account` | Trial countdown, investing-style selector (Value / Balanced / Growth), your activity, privacy controls. |

Plus auth: `/signup` (3-step, with age gate), `/login`, `/logout`. Mobile gets a bottom tab bar; desktop gets a left sidebar.

### Things to look for

- **The PRISM card on any stock profile.** Composite score 0–100, signal tier (Bullish / Neutral / Bearish), breakdown across three layers: Technical, Fundamental, News & sentiment.
- **The News & sentiment layer.** Free data only — NewsAPI (optional), GDELT, Reddit, SEC EDGAR. Zero cost per month. If no API keys are set, the L3 layer falls back to a neutral 50 with a small "cache empty" indicator.
- **The motion grammar.** Numbers count up to their final value, the chart line draws in, signals pulse when their tier changes, rows stagger in. If your OS has *Reduce motion* enabled, all animations gracefully skip to their final state.
- **The neumorphic accents.** The Plain Score coin is a round embossed circle; the P&L number is inset; the Buy / Sell buttons have a press-state when you click them.

---

## How it's built

| | |
|---|---|
| **Stack** | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind 3 |
| **Database** | SQLite via `better-sqlite3` (single file at `data/paperportfolio.db`) |
| **Charts** | `recharts` |
| **PRISM engine** | A stub right now. Deterministic per ticker (hash-driven + recent price momentum). Same input → same output. The route at `/api/prism/[ticker]` already returns the full shape (`composite_score`, `signal`, `layers`, `plain_summary`) so the real engine can drop in without touching the UI. |
| **News & sentiment** | `lib/sentiment.ts` (lexicon + GDELT-tone blend) + `lib/ingestion.ts` (4 free fetchers with TTL cache). |
| **Auth** | Local cookie + scrypt password hashing. Not OAuth, not NextAuth, not Supabase. Replace before any multi-user production. |
| **Payments** | None. The Subscribe button is a placeholder that shows "coming soon". |
| **Community feed** | 50 seeded anonymised events. No live "other users". |

---

## Project layout

```
app/
  layout.tsx              # root layout + AppShell + modals + footer
  page.tsx                # home dashboard
  globals.css             # Tailwind + motion tokens + neumorphic accents
  actions.ts              # server actions (acknowledge first signal, set style, save trade)
  signup/page.tsx         # 3-step signup with age gate
  login/page.tsx          # email + password
  logout/page.tsx
  discover/page.tsx       # stock search
  stock/[ticker]/page.tsx
  stock/[ticker]/deep/page.tsx
  portfolio/page.tsx
  community/page.tsx
  learn/page.tsx
  account/page.tsx
  api/auth/{signup,login,logout}/route.ts
  api/prism/[ticker]/route.ts
  api/trade/route.ts

components/               # AppShell, PrismCard, NewsSentimentCard, DiscoverTable,
                          # TradeButton, HotPicks, LandingPage, GlossaryIndex,
                          # CountUp, ChartLineDraw, EmbossedNumber, PlainScoreCoin,
                          # PulseBadge, ToastProvider, FirstSignalModal, TrialPaywall, …

lib/
  db.ts                   # SQLite init + schema + prepared statements
  auth.ts                 # cookie auth + scrypt
  trial.ts                # 7-day countdown
  portfolio.ts            # P&L, holdings, saveTrade
  stocks.ts               # list / get / price history
  prism.ts                # deterministic PRISM stub
  sentiment.ts            # news + Reddit + EDGAR sentiment lexicon + blend
  ingestion.ts            # NewsAPI / GDELT / Reddit / EDGAR fetchers + TTL cache
  motion.ts               # useCountUp, useDrawIn, useReducedMotion
  disclosures.ts          # every regulatory string the UI shows (the legal floor)
  constants.ts            # trial days, price, lookback
  data/glossary.json      # working glossary (12 terms)
  sp500.ts                # client-side ticker search helper

content/
  glossary-v1.json        # richer glossary content (24 terms)

seed/
  seed.ts                 # demo user + 3 portfolios + 560 stocks + 50 events
  seed_l3.ts              # L3 (news) fixtures for offline demo
  _yfinance_pull.py       # optional live-data pull

scripts/
  screenshots.ts          # optional: regenerate the 16 PNGs in screenshots/

data/                     # created by `npm run seed`, gitignored
  paperportfolio.db
screenshots/              # optional, gitignored
```

---

## Optional: pull live prices with yfinance

Out of the box, the seed uses deterministic synthetic price history (a seeded geometric random walk). If you have Python available, you can switch to live data:

```bash
pip3 install yfinance
npm run seed             # re-seed; will pull from yfinance where possible
```

If `yfinance` is not installed, the seed prints a note and falls back to the synthetic data. The app works either way — only the prices and Plain Score numbers change.

---

## Optional environment variables

The app runs with zero configuration. These are all optional:

| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | HMAC key for the session cookie. Defaults to a placeholder for local development. **Set this in any non-local deployment.** |
| `PASSWORD_SALT` | Salt for password hashing. Defaults to a placeholder for local development. |
| `NEWS_API_KEY` | Enables NewsAPI.org headlines for the L3 news & sentiment layer. Free tier is 100 requests/day. Without a key, the layer falls back to GDELT + Reddit + EDGAR. |
| `SEC_USER_AGENT` | SEC EDGAR requires a contact email in the `User-Agent` header. The dev default is a friendly placeholder so the dev server doesn't get blocked. |

---

## Disclosure audit (where the "not investment advice" copy lives)

Every regulatory string the UI shows lives in one file: `lib/disclosures.ts`. If you change the copy, change it there. The footer of every page, the inline disclosure below every signal card, the signup age gate, the trial modal, the trade-confirmation toast, and the Account privacy notice all read from this file.

---

## What is intentionally not here

- Real authentication (Supabase Auth, OAuth, magic link).
- Real payments (Stripe).
- Real cloud persistence.
- The actual PRISM engine — the stub returns a deterministic placeholder. The route shape is the contract; a real engine drops in without UI changes.
- 100-term glossary (current set is 24 working terms).
- Real-time community feed (currently static seeded events).
- French Canadian translation (strings are short enough to translate; not done yet).

These are all post-prototype phases. The brief was a learning prototype, not a production app.

---

## License

MIT. See `LICENSE`.

## Author

Built by **Taha** in Toronto. Built for learning, not for trading.