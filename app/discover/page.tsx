import { listDiscoverStocks } from '@/lib/stocks';
import { listPortfolios } from '@/lib/portfolio';
import { getCurrentUser } from '@/lib/auth';
import { DiscoverTable } from '@/components/DiscoverTable';
import { HotPicks } from '@/components/HotPicks';

export default async function DiscoverPage() {
  // Slim payload + PRISM tier per row. For 560 stocks the per-request
  // computePrism() round-trip is ~100-150ms (memoized via lib/tier-cache).
  // The 8 SQL columns match what the table actually renders — keeping
  // HTML doc transfer small so Lighthouse mobile perf holds at 95+.
  const stocks = listDiscoverStocks();
  const user = await getCurrentUser();
  const portfolios = user ? listPortfolios(user.id) : [];

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl space-y-8">
      <header>
        <p className="pv-eyebrow">Browse</p>
        <h1 className="font-serif text-h1 text-ink">Discover stocks</h1>
        <p className="text-body text-graphite mt-1 max-w-prose">
          Search by name, ticker, or sector. Filter by paper-portfolio signal.
          Plain-language scores, no jargon. All numbers are pulled from public data and shown
          as a learning aid — not a recommendation.
        </p>
      </header>

      {/* Hot Picks is the FIRST piece of content on /discover (T21 brief).
          Top 10 stocks currently flashing a Paper Buy tier signal,
          ranked by Plain Score. */}
      <HotPicks limit={10} />

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="pv-eyebrow">All stocks</p>
            <h2 className="font-serif text-h2 text-ink leading-tight">Browse the universe</h2>
          </div>
          <p className="text-caption text-stone hidden sm:block">
            {stocks.length} stocks · S&amp;P 500 + TSX 60
          </p>
        </div>
        <DiscoverTable stocks={stocks} portfolios={portfolios} />
      </section>
    </div>
  );
}
