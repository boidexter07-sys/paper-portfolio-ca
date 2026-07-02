// T67: Altier Edge — Learn articles content.
// Locked from copy/muse-learn-articles.md.
// 6 articles ship on day one. Each ends with "What you can do next".

export type ArticleSlug =
  | 'what-is-a-stock'
  | 'reading-a-balance-sheet'
  | 'prism-in-5-minutes'
  | 'how-compounding-works'
  | 'why-gut-isnt-a-strategy'
  | 'first-10-trades';

export interface ArticleMeta {
  slug: ArticleSlug;
  title: string;
  summary: string;
  readingMinutes: number;
  body: string; // markdown-ish plain text
  cta: { label: string; href: string };
}

export const ARTICLES: ArticleMeta[] = [
  {
    slug: 'what-is-a-stock',
    title: 'What is a stock, really?',
    summary: 'A stock is a share of ownership in a business. Not a lottery ticket. Not a number on a screen.',
    readingMinutes: 5,
    body: `A stock is a share of ownership in a business. When you buy one share of a company, you own a small slice of that company — its buildings, its inventory, its cash, its debts, its contracts. Your share makes you a part-owner, not a customer. That distinction matters more than most beginners realize.

Owning a share means three things. First, you can vote on big decisions at the company's annual meeting — one vote per share, on most matters. Second, you may receive a dividend, which is the company's choice to share some of its profits with shareholders instead of reinvesting everything. Third, you can sell your share to someone else on a stock exchange. The exchange is a place where buyers and sellers of shares meet to set a price. The price changes every trading day. Most days, it changes a little. Some days, it changes a lot.

A share is not a lottery ticket. A share is not a number on a screen that goes up. A share is part of a business. The price on the screen reflects what the market thinks the business is worth, and that estimate changes as new information arrives — earnings reports, management changes, industry shifts, interest rate moves, and the mood of every other person trading that day.

Here is the part most beginners miss: owning a share does not give you a guaranteed return. The business can do well and the price can still go down. The business can struggle and the price can still go up in the short run. In the long run, a stock's price tracks the underlying business — but "long run" can mean five years, ten years, or longer. Most new investors underestimate how long it can take.

The companies you can name in a sentence — the ones with the loudest stock tickers, the most-watched CEOs, the most-quoted earnings calls — are not necessarily the best businesses to own. The businesses that age well are usually the ones that do something ordinary, repeatedly, for a long time. The score on a stock card reflects the data, not the story. Read the data first. The story comes later, if at all.

#### The three things to remember

- A stock is part of a business, not a ticket.
- The price reflects what the market thinks, not what the business is worth on any given day.
- A stock does not guarantee a return. The work is in figuring out which business is worth the price.

#### What you can do next

Open the Discover page. Pick any ticker you have heard of. Read the PRISM score and the five-layer breakdown. The score is a starting question, not an answer — but the question is the right one: is this business worth the price?`,
    cta: { label: 'Open Discover', href: '/discover' },
  },
  {
    slug: 'reading-a-balance-sheet',
    title: 'Reading a balance sheet',
    summary: 'A balance sheet is a snapshot of what a company owns, what it owes, and what is left over.',
    readingMinutes: 6,
    body: `A balance sheet is a snapshot of what a company owns, what it owes, and what is left over. It is called a "balance sheet" because the two sides always balance: Assets = Liabilities + Equity. Three sections, each one a different question about the same business.

**Assets** are what the company owns. Cash in the bank. Inventory waiting to be sold. Buildings, equipment, and machines. Money customers owe the company (accounts receivable). Investments the company has made. Goodwill from acquisitions. Sort them by how quickly they turn into cash — current assets first (cash, receivables, inventory), then everything else.

**Liabilities** are what the company owes. Bills it has not paid yet. Loans coming due. Bonds outstanding. Wages and rent for the next month. Sort by when they come due — current liabilities first (the bills in the next year), then long-term debt.

**Equity** is the difference. Assets minus liabilities. This is the part of the business that "belongs" to the shareholders. When a company earns money and keeps it instead of paying it out, equity grows. When it loses money or pays out more than it earns, equity shrinks.

#### Three things to read first

- **Cash and equivalents.** How much cash does the company have on hand right now? This is the survival number.
- **Total debt versus total equity.** A rough leverage check. A company with more debt than it can service in a downturn is fragile.
- **The change from last year's balance sheet.** Compare this year to last year. Cash up or down? Debt up or down? Inventory piling up or moving?

The balance sheet is one of three statements. The other two — the income statement and the cash flow statement — fill in the rest of the picture. The income statement tells you whether the business made money over a period. The cash flow statement tells you where the cash actually went. Read all three before you make a call.

A second pass worth doing: read the same balance sheet across two or three years. A single year tells you what the company looks like today. Two or three years tells you what is changing. Cash trending down quarter after quarter is a different story than cash drifting down because of a single large purchase. Debt that climbs every year for four years is a different story than debt that climbs once and then holds. The trend is the message. The single point in time is just the headline.

#### What you can do next

Pick a stock you are curious about. Open the Stock Detail page. Scroll to the financials. Read the balance sheet, the income statement, and the cash flow. Look at three things: cash on hand, total debt, and the year-over-year change in equity. The PRISM layer VALUE_VS_EARNINGS reads the same numbers from a different angle. Compare the two. The comparison is the lesson.`,
    cta: { label: 'Open Discover', href: '/discover' },
  },
  {
    slug: 'prism-in-5-minutes',
    title: 'PRISM in 5 minutes',
    summary: 'PRISM scores every stock 0 to 100, on the same scale, using the same five layers, every time.',
    readingMinutes: 5,
    body: `PRISM is the scoring model inside Altier Edge. It reads every stock in the universe and gives it a number from 0 to 100, on the same scale, using the same five layers, every time. The number is not a prediction. The number is a score — a snapshot of what the data is showing.

PRISM is built from five named layers. The layers are the same on every stock card. The weights are the same. The bands are the same. The math is published.

- **L1 — Price momentum.** What the price has done recently. Trend, drawdown, move relative to its own history. Weight: 20%.
- **L2 — Value vs. earnings.** How the price compares to the earnings the business actually produces. The value anchor. Weight: 25%.
- **L3 — Earnings revisions.** Whether analyst consensus is moving up or down on forward estimates. The direction of the story. Weight: 15%.
- **L4 — Insider flow.** What insiders are doing with their own money. Net buying, net selling, conviction signals. Weight: 15%.
- **L5 — Analyst conviction.** How aligned the sell-side analyst community is on the next-twelve-months call. Dispersion, not level. Weight: 25%.

The five weights add to 100. The Plain Score on every stock card is the weighted sum of the five layer sub-scores.

#### The bands

- **Strong Paper Buy (75–100).** The signals look strong across the board.
- **Paper Buy (55–74).** The signals lean positive.
- **Hold (40–54).** The signals are mixed. No clear read.
- **Paper Sell (20–39).** The signals lean negative.
- **Strong Paper Sell (0–19).** The signals look weak across the board.

The word "paper" is on every band name on purpose. PRISM scores a paper trade — a hypothetical position. It is not investment advice. It is one model reading the data in front of it.

PRISM shows in three places. The score pill on every stock card (a two-digit number plus the band). The layer breakdown on each stock card (the five rows). The drill-down on the Stock Detail page, where each row expands to show the inputs.

The one thing to remember: PRISM scores what the data shows. It does not opine. It does not predict. It does not forecast. The number is the model's read of the current data, recomputed every night.

#### What you can do next

Open a stock you own or have been considering. Read the five layers. Find the layer that surprises you — the one that says something different from what your gut says. Click into the layer. Read the inputs. The surprise is where the model is telling you something you did not have in your head.`,
    cta: { label: 'Open Discover', href: '/discover' },
  },
  {
    slug: 'how-compounding-works',
    title: 'How compounding works',
    summary: 'Small gains early look small for a long time, then look enormous.',
    readingMinutes: 5,
    body: `Compounding is what happens when the return you earn on an investment earns a return of its own. Not just this year. Next year. And the year after. The shape of compounding is exponential: small gains early look small, then look small for a long time, then look enormous.

A dollar that earns 8% a year turns into $2.16 in ten years. It turns into $4.66 in twenty years. It turns into $10.06 in thirty years. Same 8%. Same dollar. The only thing that changed was the number of years the dollar was in the market.

The catch is the word "the market." Compounding requires that the money stays in. A dollar that earns 8% a year for ten years then loses 30% in a bad year is no longer compounding. The sequence of returns matters as much as the average. Most new investors underestimate how much the sequence can hurt.

Here is the rule of thumb that has held for a century: time in the market beats timing the market, more often than not. Not always. Sometimes a cash position is the right call. The rule of thumb is a starting point, not a verdict.

#### Three things that help compounding work

- **Start earlier than feels reasonable.** Five extra years at the beginning is worth more than five extra years at the end.
- **Keep your costs low.** A 1% fee on a long-horizon portfolio takes more out than most beginners realize.
- **Do less.** Trading is a cost. Selling is a tax event. The default move is to keep holding. Rebalance when the structure of the portfolio demands it, not when the news cycle demands it.

The math is older than most of the people who write about it. Ben Graham said it; Warren Buffett said it; Jack Bogle said it. The reason they all said it is that it works.

Two more things worth knowing. The first is the role of inflation: a return of 8% a year with 3% inflation is a real return closer to 5%. The compounding still works. It just compounds a smaller number. The second is the role of taxes: a portfolio held inside a tax-sheltered account (a TFSA or RRSP in Canada, an IRA or 401(k) in the US) keeps more of the compounding than one held in a taxable account. The structure of the account is part of the strategy.

Compounding is not exciting. Compounding is not a story. Compounding is a math problem with a long answer. The answer is worth the wait.

#### What you can do next

Open your portfolio dashboard. Look at the longest-held position. That position has been compounding (or it has not). Read the PRISM score on that ticker today. The number is the model's current read. Compare it to what the position was when you opened it. The difference is what time in the market gave you.`,
    cta: { label: 'Open Portfolio', href: '/portfolio' },
  },
  {
    slug: 'why-gut-isnt-a-strategy',
    title: 'Why your gut isn\'t a strategy',
    summary: 'Gut feeling is a real input. The problem is when it is the only input.',
    readingMinutes: 5,
    body: `Gut feeling is a real input. The problem is when it is the only input.

Your gut feels what it has been trained to feel. Stories you have read. Conversations you have overheard. The shape of the last chart you looked at. The last headline that scared you. Your gut has not been trained on the data the model has been trained on. Your gut has been trained on the news cycle.

Here is the thing about the news cycle. The news cycle is mostly noise. Important events happen rarely. Most of the news between the important events is filler that the market has already priced in by the time you read it. A gut that responds to every headline is a gut that overtrades.

#### Paper-trading is the antidote

When you paper-trade, you put a thesis through the full process of a trade — pick the stock, set the entry, set the exit, watch the price move, see the result — without risking money you cannot afford to lose. The thesis gets tested. The gut gets feedback. The feedback is the lesson.

#### Three reasons paper-trading works

- **You can afford to be wrong.** A wrong paper trade costs credits, not rent money. The lesson is the same. The downside is different.
- **You learn the shape of your biases.** Most investors will not admit they have a pattern of selling too early or holding too long. Paper trading shows you the pattern on the screen.
- **You build a track record before you build a portfolio.** When you finally put real money on a thesis, you have already done the work. You are not guessing. You are repeating a process that has worked on paper.

A paper trade is not a predictor of a real trade. The psychology is different — real money triggers different feelings than credits. But the structure is the same. The pattern is the same. The lesson is the same.

The first ten trades you paper-trade will teach you more than the first ten articles you read about trading. Read the articles too. Then paper-trade.

#### What you can do next

Enter a Rookie challenge on ARENA. Pick a stock with a PRISM score you can defend in a sentence. Watch the window. See the result. The first Rookie challenge is the easiest place to start because the math is simpler and the stakes are smaller. The lesson shows up either way.`,
    cta: { label: 'Open ARENA', href: '/arena' },
  },
  {
    slug: 'first-10-trades',
    title: 'The first 10 trades you should paper-trade',
    summary: 'The point is not the ten trades. The point is the write-up at the end.',
    readingMinutes: 7,
    body: `There is no perfect first trade. There is a useful first trade. The point of the first ten paper trades is not to make money. The point is to learn the shape of the process. A trade that teaches you something is a better trade than a trade that prints a green number for the wrong reason.

Here is a sequence that has worked for new investors. Each trade is small in stakes. Each one tests a single idea. Each one ends with a written note about what you expected, what happened, and what you would do differently next time.

1. **A momentum follow-through.** Pick a stock that is up three or more days in a row. Enter at the open of day four. Exit at the close. Question to answer: does the trend extend or reverse?
2. **A value-versus-earnings test.** Pick the cheapest stock in a sector you know by PRISM's value layer alone. Enter. Hold for a week. Question to answer: does the score's read of "cheap" match what the market does next?
3. **An earnings reaction.** Pick a stock with earnings due during the window. Enter before earnings. Exit the day after. Question to answer: do you have a thesis that survives the news, or are you guessing?
4. **A failure follow-through.** Pick a stock that dropped sharply on bad news. Enter the day after the drop. Hold for three days. Question to answer: is the drop a buying opportunity, or is the news the start of a new trend?
5. **A trend reversal.** Pick a stock that has been going down for a month. Look for a basing pattern. Enter when the trend turns. Question to answer: can you call a turn, or do you need more time?
6. **A pair trade.** Pick two stocks in the same sector. Go long the stronger one by PRISM, short the weaker one by PRISM. Hold for a week. Question to answer: does the differential close, widen, or hold?
7. **An insider signal.** Pick a stock where insiders have been net buyers in the last quarter. Enter. Hold for two weeks. Question to answer: do insiders know something the price has not priced in yet?
8. **A consensus shift.** Pick a stock where analyst consensus has been revised up by 5% or more in the last month. Enter. Hold for two weeks. Question to answer: is the revision real signal, or noise?
9. **A held-window test.** Pick a stock with a PRISM score you can defend. Enter at the open of a five-day challenge. Hold through the close. Question to answer: can you sit with a position through the noise?
10. **A write-up.** Pick the trade that taught you the most. Write three paragraphs. What you expected. What happened. What you would do differently next time. Keep the write-up. Look at it again after ten more paper trades.

The point is not the ten trades. The point is the write-up at the end. The write-up is where the lesson lives.

#### What you can do next

Open the ARENA dashboard. Pick one challenge from this list that you have not tried yet. Run it. Write the note after the window closes. The note is the asset that survives the trade.`,
    cta: { label: 'Open ARENA', href: '/arena' },
  },
];

export function findArticle(slug: string): ArticleMeta | null {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}