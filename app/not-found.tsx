import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
      <div className="pv-card p-6 sm:p-8 text-center">
        <p className="pv-eyebrow text-stone">Not found</p>
        <h1 className="font-serif text-h1 text-ink mt-1">We can&apos;t find that page.</h1>
        <p className="text-body text-graphite mt-2 max-w-prose mx-auto">
          The link might be old, or the page moved. Try the dashboard or browse stocks.
        </p>
        <div className="mt-5 flex gap-2 justify-center">
          <Link href="/" className="pv-btn-primary">Go to home</Link>
          <Link href="/discover" className="pv-btn-ghost">Browse stocks</Link>
        </div>
      </div>
    </div>
  );
}
