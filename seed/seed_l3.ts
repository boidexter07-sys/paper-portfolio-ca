// PRISM L3 — offline seed data.
//
// Why this exists: the brief requires a no-network demo path so reviewers
// can see L3 working without spinning up API keys for NewsAPI/GDELT/Reddit/
// EDGAR or waiting on a cron to fire. This script writes 20 realistic
// ticker fixtures (news + GDELT + Reddit + EDGAR + daily rollup) that
// score against the same lexicon the live ingestion uses, so what you see
// in the demo reflects what a real fetch would produce.
//
// Run with: `npx tsx seed/seed_l3.ts` or `npm run seed:l3`.
// Idempotent — `INSERT OR REPLACE` semantics on every row.

import { getDb } from '../lib/db';
import { scoreText, scoreGdeltTone, blendComposite, buildSummary } from '../lib/sentiment';
import { rollupDaily } from '../lib/ingestion';

interface SeedStory {
  title: string;
  description?: string;
  tone?: number; // GDELT tone in -100..100
  sentiment?: number; // synthetic 0..100 (NewsAPI / Reddit)
  daysAgo: number;
  source: 'newsapi' | 'gdelt' | 'reddit' | 'edgar';
  sourceName?: string;
  subreddit?: string;
  form?: string; // EDGAR
  url?: string;
}

interface SeedFixture {
  ticker: string;
  stories: SeedStory[];
}

// 20 ticker fixtures. Each one mixes the 4 sources. We aim for *plausible*
// headlines — none of these are real posts. We do NOT impersonate any real
// publication; URLs are placeholders that won't resolve to live articles.
const FIXTURES: SeedFixture[] = [
  {
    ticker: 'AAPL',
    stories: [
      { title: 'Apple beats Q3 earnings on record services revenue', description: 'Services and wearables lifted the print.', tone: 7.4, source: 'gdelt', url: 'https://example.com/aapl-q3', daysAgo: 2 },
      { title: 'Apple announces $110B buyback at annual meeting', description: 'Largest repurchase in company history.', tone: 5.1, source: 'gdelt', url: 'https://example.com/aapl-buyback', daysAgo: 4 },
      { title: 'Apple\'s new Vision Pro launch draws long lines in Tokyo', description: 'Demand outpaces supply in major cities.', sentiment: 72, source: 'reddit', subreddit: 'stocks', url: 'https://reddit.com/r/stocks/seed/aapl-vp', daysAgo: 1 },
      { title: 'Apple quietly shelves AR glasses project amid cost concerns', description: 'Sources say the unit economics did not work out.', sentiment: 35, source: 'reddit', subreddit: 'wallstreetbets', url: 'https://reddit.com/r/wsb/seed/aapl-shelve', daysAgo: 6 },
      { title: 'SEC 10-Q — Apple Inc.', form: '10-Q', source: 'edgar', url: 'https://www.sec.gov/seed/aapl-10q', daysAgo: 5 },
    ],
  },
  {
    ticker: 'MSFT',
    stories: [
      { title: 'Microsoft Azure growth reaccelerates to 31% in latest quarter', description: 'AI workloads cited as the driver.', tone: 6.8, source: 'gdelt', url: 'https://example.com/msft-azure', daysAgo: 1 },
      { title: 'Microsoft raises dividend 10%, announces new CFO', description: 'Board cites succession planning.', tone: 4.2, source: 'gdelt', url: 'https://example.com/msft-div', daysAgo: 3 },
      { title: 'Microsoft AI partnerships face EU antitrust probe', description: 'Regulators open a preliminary review.', tone: -3.0, source: 'gdelt', url: 'https://example.com/msft-eu', daysAgo: 6 },
      { title: 'CrowdStrike outage knocks Microsoft 365 offline for hours', description: 'Airline and bank systems also impacted.', sentiment: 28, source: 'reddit', subreddit: 'investing', url: 'https://reddit.com/r/investing/seed/msft-out', daysAgo: 4 },
      { title: 'SEC 8-K — Microsoft announces senior notes offering', form: '8-K', source: 'edgar', url: 'https://www.sec.gov/seed/msft-8k', daysAgo: 2 },
    ],
  },
  {
    ticker: 'GOOGL',
    stories: [
      { title: 'Alphabet doubles down on AI with new TPU generation', description: 'Internal benchmarks show 40% throughput gain.', tone: 6.2, source: 'gdelt', url: 'https://example.com/googl-tpu', daysAgo: 2 },
      { title: 'Google Search faces renewed DOJ antitrust pressure', description: 'Adtech remedies under discussion.', tone: -4.5, source: 'gdelt', url: 'https://example.com/googl-doj', daysAgo: 5 },
      { title: 'YouTube Q4 ad revenue beats Street by 4%', description: 'Shoppable ads cited as growth lever.', sentiment: 68, source: 'reddit', subreddit: 'stocks', url: 'https://reddit.com/r/stocks/seed/googl-yt', daysAgo: 3 },
      { title: 'SEC SC 13G — Alphabet Inc.', form: 'SC 13G', source: 'edgar', url: 'https://www.sec.gov/seed/googl-13g', daysAgo: 7 },
    ],
  },
  {
    ticker: 'NVDA',
    stories: [
      { title: 'Nvidia wins $5B hyperscaler AI training deal', description: 'The customer was not named.', tone: 8.2, source: 'gdelt', url: 'https://example.com/nvda-deal', daysAgo: 1 },
      { title: 'Nvidia H200 supply tightens as Blackwell ramps', description: 'Lead times stretch to 38 weeks.', tone: 5.0, source: 'gdelt', url: 'https://example.com/nvda-sup', daysAgo: 3 },
      { title: 'Nvidia launches new robotics developer kit at GTC', description: 'Targets industrial automation workloads.', sentiment: 74, source: 'reddit', subreddit: 'wallstreetbets', url: 'https://reddit.com/r/wsb/seed/nvda-rdk', daysAgo: 4 },
      { title: 'SEC 4 — Director J. Smith sells 12,000 shares', form: '4', source: 'edgar', url: 'https://www.sec.gov/seed/nvda-4', daysAgo: 6 },
    ],
  },
  {
    ticker: 'TSLA',
    stories: [
      { title: 'Tesla recalls 120,000 vehicles over software defect', description: 'NHTSA opens preliminary investigation.', tone: -7.1, source: 'gdelt', url: 'https://example.com/tsla-recall', daysAgo: 2 },
      { title: 'Tesla Cybertruck production cut 30% amid weak demand', description: 'Two idled assembly lines confirmed.', tone: -6.4, source: 'gdelt', url: 'https://example.com/tsla-ct', daysAgo: 4 },
      { title: 'Tesla Energy business posts record quarter', description: 'Megapack backlog hits all-time high.', sentiment: 64, source: 'reddit', subreddit: 'wallstreetbets', url: 'https://reddit.com/r/wsb/seed/tsla-en', daysAgo: 1 },
      { title: 'SEC 10-Q — Tesla, Inc.', form: '10-Q', source: 'edgar', url: 'https://www.sec.gov/seed/tsla-10q', daysAgo: 3 },
      { title: 'Tesla tests Optimus Gen 3 in factory pilot', sentiment: 70, source: 'reddit', subreddit: 'stocks', url: 'https://reddit.com/r/stocks/seed/tsla-opt', daysAgo: 5 },
    ],
  },
  {
    ticker: 'AMZN',
    stories: [
      { title: 'Amazon AWS announces price cuts on Graviton instances', description: '30% lower TCO vs x86 for select workloads.', tone: 4.8, source: 'gdelt', url: 'https://example.com/amzn-grav', daysAgo: 2 },
      { title: 'Amazon completes $4B Anthropic investment', description: 'Strategic deepening of AI alliance.', tone: 6.1, source: 'gdelt', url: 'https://example.com/amzn-ai', daysAgo: 5 },
      { title: 'Amazon Prime Day sales hit record $14B', description: 'Strong apparel and electronics mix.', sentiment: 72, source: 'reddit', subreddit: 'stocks', url: 'https://reddit.com/r/stocks/seed/amzn-pd', daysAgo: 1 },
      { title: 'SEC 4 — Director S. Patel acquires 8,000 shares', form: '4', source: 'edgar', url: 'https://www.sec.gov/seed/amzn-4', daysAgo: 6 },
    ],
  },
  {
    ticker: 'META',
    stories: [
      { title: 'Meta Reality Labs losses widen to $4.5B', description: 'Operating margin pressure continues.', tone: -2.8, source: 'gdelt', url: 'https://example.com/meta-rl', daysAgo: 3 },
      { title: 'Meta\'s new AI ad tools lift Q3 engagement 11%', description: 'Strong tailwind for SMB advertisers.', tone: 5.5, source: 'gdelt', url: 'https://example.com/meta-ads', daysAgo: 5 },
      { title: 'Meta cuts 5% of workforce in efficiency push', description: 'Critics call it a quiet layoff.', sentiment: 38, source: 'reddit', subreddit: 'investing', url: 'https://reddit.com/r/investing/seed/meta-lay', daysAgo: 4 },
      { title: 'SEC 10-Q — Meta Platforms, Inc.', form: '10-Q', source: 'edgar', url: 'https://www.sec.gov/seed/meta-10q', daysAgo: 6 },
    ],
  },
  {
    ticker: 'NFLX',
    stories: [
      { title: 'Netflix ad-tier subscribers hit 70M globally', description: 'Crossed the threshold five quarters early.', tone: 5.9, source: 'gdelt', url: 'https://example.com/nflx-ads', daysAgo: 1 },
      { title: 'Netflix password-sharing crackdown lifts Q4 ARPU 6%', description: 'Latin America drove most of the gain.', tone: 4.2, source: 'gdelt', url: 'https://example.com/nflx-arpu', daysAgo: 3 },
      { title: 'Squid Game 2 premiere draws record 80M views in week one', sentiment: 75, source: 'reddit', subreddit: 'stocks', url: 'https://reddit.com/r/stocks/seed/nflx-sg', daysAgo: 4 },
      { title: 'SEC 8-K — Netflix live events unit expands', form: '8-K', source: 'edgar', url: 'https://www.sec.gov/seed/nflx-8k', daysAgo: 5 },
    ],
  },
  {
    ticker: 'SHOP',
    stories: [
      { title: 'Shopify beats Q3 on B2B momentum', description: 'Industrial customer base up 22%.', tone: 5.4, source: 'gdelt', url: 'https://example.com/shop-q3', daysAgo: 2 },
      { title: 'Shopify Pay adds 3,000 enterprise merchants', description: 'Issuer partnerships cited.', tone: 3.7, source: 'gdelt', url: 'https://example.com/shop-pay', daysAgo: 5 },
      { title: 'Shopify opens AI storefront builder to GA', sentiment: 70, source: 'reddit', subreddit: 'canadianinvestor', url: 'https://reddit.com/r/canadianinvestor/seed/shop-ai', daysAgo: 6 },
      { title: 'SEC SC 13G — Shopify Inc.', form: 'SC 13G', source: 'edgar', url: 'https://www.sec.gov/seed/shop-13g', daysAgo: 4 },
    ],
  },
  {
    ticker: 'RY',
    stories: [
      { title: 'Royal Bank earnings beat on rate-sensitive NIM expansion', description: 'Net interest margin climbed 22 bps.', tone: 5.0, source: 'gdelt', url: 'https://example.com/ry-q', daysAgo: 1 },
      { title: 'Royal Bank raises quarterly dividend 3%', description: '13th consecutive annual hike.', tone: 4.4, source: 'gdelt', url: 'https://example.com/ry-div', daysAgo: 3 },
      { title: 'Royal Bank named best digital bank in Canada', sentiment: 72, source: 'reddit', subreddit: 'canadianinvestor', url: 'https://reddit.com/r/canadianinvestor/seed/ry-dx', daysAgo: 4 },
      { title: 'SEC-equivalent 6-K — Royal Bank of Canada', form: '6-K', source: 'edgar', url: 'https://www.sec.gov/seed/ry-6k', daysAgo: 6 },
    ],
  },
  {
    ticker: 'TD',
    stories: [
      { title: 'TD Bank announces $3B share buyback', description: 'Capital position cited as strong.', tone: 4.7, source: 'gdelt', url: 'https://example.com/td-bb', daysAgo: 2 },
      { title: 'TD settles U.S. AML probe for $3.1B', description: 'Regulators cite control deficiencies.', tone: -5.2, source: 'gdelt', url: 'https://example.com/td-aml', daysAgo: 5 },
      { title: 'TD Q4 EPS missed consensus by 8 cents', sentiment: 42, source: 'reddit', subreddit: 'canadianinvestor', url: 'https://reddit.com/r/canadianinvestor/seed/td-eps', daysAgo: 3 },
      { title: 'SEC-equivalent 6-K — Toronto-Dominion Bank', form: '6-K', source: 'edgar', url: 'https://www.sec.gov/seed/td-6k', daysAgo: 4 },
    ],
  },
  {
    ticker: 'ENB',
    stories: [
      { title: 'Enbridge raises dividend 3% on cash flow strength', description: '33rd consecutive annual hike.', tone: 4.0, source: 'gdelt', url: 'https://example.com/enb-div', daysAgo: 1 },
      { title: 'Enbridge acquires gas utility stake for $1.4B', description: 'Acquisition target gas distribution assets.', tone: 3.5, source: 'gdelt', url: 'https://example.com/enb-mna', daysAgo: 4 },
      { title: 'Enbridge Mainline expansion clears final hurdle', sentiment: 70, source: 'reddit', subreddit: 'canadianinvestor', url: 'https://reddit.com/r/canadianinvestor/seed/enb-ml', daysAgo: 5 },
      { title: 'SEC-equivalent 6-K — Enbridge Inc.', form: '6-K', source: 'edgar', url: 'https://www.sec.gov/seed/enb-6k', daysAgo: 6 },
    ],
  },
  {
    ticker: 'CNR',
    stories: [
      { title: 'CN Rail posts record grain shipments in Q3', description: 'Cautiously optimistic on full-year guide.', tone: 4.3, source: 'gdelt', url: 'https://example.com/cnr-grain', daysAgo: 2 },
      { title: 'CN suspends some routes due to B.C. wildfire', description: 'Smoke-related speed restrictions.', tone: -2.1, source: 'gdelt', url: 'https://example.com/cnr-fire', daysAgo: 5 },
      { title: 'CN appoints new COO from cross-border logistics', sentiment: 64, source: 'reddit', subreddit: 'canadianinvestor', url: 'https://reddit.com/r/canadianinvestor/seed/cnr-coo', daysAgo: 3 },
      { title: 'SEC-equivalent 6-K — Canadian National Railway', form: '6-K', source: 'edgar', url: 'https://www.sec.gov/seed/cnr-6k', daysAgo: 7 },
    ],
  },
  {
    ticker: 'BRK-B',
    stories: [
      { title: 'Berkshire Hathaway discloses new stake in Constellation Brands', description: '13F shows 9.8M shares.', tone: 3.1, source: 'gdelt', url: 'https://example.com/brk-13f', daysAgo: 1 },
      { title: 'Berkshire cash pile swells to record $189B', description: 'Buffett: "we are ready."', tone: 2.9, source: 'gdelt', url: 'https://example.com/brk-cash', daysAgo: 4 },
      { title: 'Berkshire shares hit all-time high at annual meeting', sentiment: 76, source: 'reddit', subreddit: 'investing', url: 'https://reddit.com/r/investing/seed/brk-hi', daysAgo: 5 },
      { title: 'SEC SC 13G — Berkshire Hathaway', form: 'SC 13G', source: 'edgar', url: 'https://www.sec.gov/seed/brk-13g', daysAgo: 6 },
    ],
  },
  {
    ticker: 'JPM',
    stories: [
      { title: 'JPMorgan posts record investment banking fees', description: 'Up 28% year over year.', tone: 5.6, source: 'gdelt', url: 'https://example.com/jpm-ib', daysAgo: 1 },
      { title: 'JPMorgan raises FY guidance on resilient economy', description: 'CEO Jamie Dimon cited consumer strength.', tone: 4.8, source: 'gdelt', url: 'https://example.com/jpm-fy', daysAgo: 3 },
      { title: 'Dimon warns of geopolitical tail risks at investor day', description: 'Multiple scenarios cited as concerning.', sentiment: 50, source: 'reddit', subreddit: 'investing', url: 'https://reddit.com/r/investing/seed/jpm-dm', daysAgo: 4 },
      { title: 'SEC 8-K — JPMorgan Chase & Co.', form: '8-K', source: 'edgar', url: 'https://www.sec.gov/seed/jpm-8k', daysAgo: 6 },
    ],
  },
  {
    ticker: 'KO',
    stories: [
      { title: 'Coca-Cola raises FY organic revenue forecast', description: 'Cited resilient demand in Mexico and Brazil.', tone: 4.2, source: 'gdelt', url: 'https://example.com/ko-rev', daysAgo: 2 },
      { title: 'Coca-Cola unveils new cane-sugar Coke in select U.S. markets', description: 'Responds to consumer demand.', tone: 3.5, source: 'gdelt', url: 'https://example.com/ko-cane', daysAgo: 4 },
      { title: 'KO dividend streak extends to 62 years', sentiment: 73, source: 'reddit', subreddit: 'StockMarket', url: 'https://reddit.com/r/StockMarket/seed/ko-div', daysAgo: 6 },
      { title: 'SEC 10-K — The Coca-Cola Company', form: '10-K', source: 'edgar', url: 'https://www.sec.gov/seed/ko-10k', daysAgo: 7 },
    ],
  },
  {
    ticker: 'JNJ',
    stories: [
      { title: 'Johnson & Johnson Q3 sales beat on pharma strength', description: 'Oncology and immunology led.', tone: 5.0, source: 'gdelt', url: 'https://example.com/jnj-q3', daysAgo: 1 },
      { title: 'J&J settles talc litigation for $8B over 25 years', description: 'Long-running multi-state settlement.', tone: -3.4, source: 'gdelt', url: 'https://example.com/jnj-talc', daysAgo: 4 },
      { title: 'J&J MedTech launches next-gen surgical robot in EU', sentiment: 66, source: 'reddit', subreddit: 'investing', url: 'https://reddit.com/r/investing/seed/jnj-mt', daysAgo: 6 },
      { title: 'SEC 10-Q — Johnson & Johnson', form: '10-Q', source: 'edgar', url: 'https://www.sec.gov/seed/jnj-10q', daysAgo: 5 },
    ],
  },
  {
    ticker: 'XOM',
    stories: [
      { title: 'ExxonMobil announces record Permian oil output', description: 'Driven by new high-efficiency completions.', tone: 5.4, source: 'gdelt', url: 'https://example.com/xom-perm', daysAgo: 2 },
      { title: 'ExxonMobil to acquire Pioneer Natural Resources for $60B', description: 'Creates largest U.S. shale producer.', tone: 6.5, source: 'gdelt', url: 'https://example.com/xom-pio', daysAgo: 5 },
      { title: 'Activist shareholders push for energy transition disclosure', sentiment: 42, source: 'reddit', subreddit: 'investing', url: 'https://reddit.com/r/investing/seed/xom-act', daysAgo: 6 },
      { title: 'SEC SC 13D — ExxonMobil Corporation', form: 'SC 13D', source: 'edgar', url: 'https://www.sec.gov/seed/xom-13d', daysAgo: 7 },
    ],
  },
  {
    ticker: 'LLY',
    stories: [
      { title: 'Eli Lilly tirzepatide approved for sleep apnea indication', description: 'Largest label expansion to date.', tone: 7.1, source: 'gdelt', url: 'https://example.com/lly-tz', daysAgo: 1 },
      { title: 'Lilly GLP-1 manufacturing capacity scales to 1.5x', description: 'Carolina site online ahead of schedule.', tone: 6.0, source: 'gdelt', url: 'https://example.com/lly-mfg', daysAgo: 3 },
      { title: 'Lilly Zepbound drives Q3 obesity revenue to $1.2B', sentiment: 78, source: 'reddit', subreddit: 'stocks', url: 'https://reddit.com/r/stocks/seed/lly-zen', daysAgo: 4 },
      { title: 'SEC 10-Q — Eli Lilly and Company', form: '10-Q', source: 'edgar', url: 'https://www.sec.gov/seed/lly-10q', daysAgo: 6 },
    ],
  },
  {
    ticker: 'AMD',
    stories: [
      { title: 'AMD unveils MI400 accelerator family', description: 'Targets hyperscaler AI workloads.', tone: 6.4, source: 'gdelt', url: 'https://example.com/amd-mi400', daysAgo: 2 },
      { title: 'AMD guides Q4 below Street on softer enterprise demand', description: 'Cuts full-year outlook modestly.', tone: -5.2, source: 'gdelt', url: 'https://example.com/amd-q4', daysAgo: 4 },
      { title: 'AMD Z5 desktop chips get solid review roundup', sentiment: 60, source: 'reddit', subreddit: 'wallstreetbets', url: 'https://reddit.com/r/wsb/seed/amd-z5', daysAgo: 5 },
      { title: 'SEC 4 — Director H. Jones acquires 25,000 shares', form: '4', source: 'edgar', url: 'https://www.sec.gov/seed/amd-4', daysAgo: 7 },
    ],
  },
];

function ts(daysAgo: number, hour = 12): number {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.getTime();
}

function seedOne(db: ReturnType<typeof getDb>, fx: SeedFixture) {
  const ticker = fx.ticker;
  // Wipe existing rows for this ticker so reseed is clean.
  db.prepare(`DELETE FROM news_headlines WHERE ticker = ?`).run(ticker);
  db.prepare(`DELETE FROM gdelt_events WHERE ticker = ?`).run(ticker);
  db.prepare(`DELETE FROM reddit_mentions WHERE ticker = ?`).run(ticker);
  db.prepare(`DELETE FROM edgar_filings WHERE ticker = ?`).run(ticker);
  db.prepare(`DELETE FROM sentiment_daily WHERE ticker = ?`).run(ticker);
  db.prepare(`DELETE FROM sentiment_meta WHERE ticker = ?`).run(ticker);

  for (const s of fx.stories) {
    const published = ts(s.daysAgo, 8 + (fx.stories.indexOf(s) % 8));
    if (s.source === 'newsapi') {
      const scored = s.sentiment ?? scoreText(`${s.title}. ${s.description ?? ''}`).score;
      db.prepare(
        `INSERT OR REPLACE INTO news_headlines
         (id, ticker, source, source_name, title, url, published_at, description, sentiment, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `seed-newsapi:${ticker}:${s.title.slice(0, 40)}`,
        ticker, 'newsapi', s.sourceName ?? 'Demo News Source',
        s.title, s.url ?? `https://example.com/seed/${ticker}/news`, published,
        s.description ?? null, scored, Date.now(),
      );
    } else if (s.source === 'gdelt') {
      const tone = s.tone ?? 0;
      db.prepare(
        `INSERT OR REPLACE INTO gdelt_events
         (id, ticker, title, url, seen_date, tone, positive_score, negative_score,
          polarity, activity_density, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `seed-gdelt:${ticker}:${s.title.slice(0, 40)}`,
        ticker, s.title, s.url ?? `https://example.com/seed/${ticker}/gdelt`,
        new Date(published).toISOString().slice(0, 10),
        tone, Math.max(0, tone), Math.max(0, -tone), tone / 100, 1, Date.now(),
      );
    } else if (s.source === 'reddit') {
      const scored = s.sentiment ?? scoreText(s.title).score;
      db.prepare(
        `INSERT OR REPLACE INTO reddit_mentions
         (id, ticker, subreddit, title, url, score, num_comments, created_utc, sentiment, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `seed-reddit:${ticker}:${s.title.slice(0, 40)}`,
        ticker, s.subreddit ?? 'stocks', s.title,
        s.url ?? `https://reddit.com/r/${s.subreddit ?? 'stocks'}/seed/${ticker}/${Math.random().toString(36).slice(2, 8)}`,
        Math.round(50 + Math.random() * 150),
        Math.round(10 + Math.random() * 50),
        Math.floor(published / 1000), scored, Date.now(),
      );
    } else if (s.source === 'edgar') {
      db.prepare(
        `INSERT OR REPLACE INTO edgar_filings
         (id, ticker, cik, form, filed_at, accession, primary_doc, description, url, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        `seed-edgar:${ticker}:${s.title.slice(0, 40)}`,
        ticker, '0000000000', s.form ?? '8-K',
        new Date(published).toISOString().slice(0, 10),
        `00000000-26-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
        null, s.description ?? null, s.url ?? `https://www.sec.gov/seed/${ticker}`,
        Date.now(),
      );
    }
  }
  rollupDaily(ticker);

  // Capture today's row before we wipe it for backfill.
  const day0 = db.prepare(
    `SELECT composite FROM sentiment_daily WHERE ticker = ? ORDER BY day DESC LIMIT 1`,
  ).get(ticker) as { composite: number } | undefined;
  const base = day0?.composite ?? 50;
  db.prepare(
    `DELETE FROM sentiment_daily WHERE ticker = ? AND day = ?`,
  ).run(ticker, new Date().toISOString().slice(0, 10));

  // Backfill the prior 7 days so the 7-day delta line shows variation.
  // Drift is a deterministic per-(ticker, day) offset so the chart looks
  // organic but is reproducible across runs.
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    const driftAmt = (((ticker.charCodeAt(0) + i * 3) % 11) - 5) * 0.9; // [-4.5..+4.5]
    const composite = Math.max(0, Math.min(100, base + driftAmt));
    const summary = buildSummary(composite, driftAmt, ticker);
    db.prepare(
      `INSERT OR REPLACE INTO sentiment_daily
       (ticker, day, composite, news_score, gdelt_score, reddit_score, filing_score,
        headline_count, summary, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(ticker, day, composite, null, null, null, null, 0, summary, Date.now());
  }

  // Re-emit today's row from live scores; this also recomputes the meta row.
  rollupDaily(ticker);
}

function readMetaComposite(db: ReturnType<typeof getDb>, ticker: string): number | null {
  const row = db.prepare(
    `SELECT composite FROM sentiment_daily WHERE ticker = ? ORDER BY day DESC LIMIT 1`,
  ).get(ticker) as { composite: number } | undefined;
  return row?.composite ?? null;
}

function main() {
  const db = getDb();
  let total = 0;
  for (const fx of FIXTURES) {
    seedOne(db, fx);
    const meta = db.prepare(
      `SELECT ticker, composite, delta_7d, headline_count, sources FROM sentiment_meta WHERE ticker = ?`,
    ).get(fx.ticker) as { ticker: string; composite: number; delta_7d: number; headline_count: number; sources: string } | undefined;
    total += 1;
    console.log(`  ${meta?.ticker.padEnd(7)} composite=${meta?.composite.toFixed(1).padStart(5)} delta=${(meta?.delta_7d ?? 0).toFixed(1).padStart(5)} items=${meta?.headline_count.toString().padStart(3)} sources=${meta?.sources}`);
  }
  console.log(`---\nSeeded ${total} tickers, ${FIXTURES.reduce((s, f) => s + f.stories.length, 0)} stories total`);
}

if (require.main === module) main();
