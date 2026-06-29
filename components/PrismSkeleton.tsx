// PrismSkeleton — placeholder with the same dimensions as PrismCard.
// Used as the Suspense fallback so the rest of the page renders while
// computePrism() (which can block on a locked SQLite writer) finishes.

export function PrismSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`pv-card p-4 sm:p-5 ${compact ? '' : 'sm:p-6'}`}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading Plain Score"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="h-3 w-24 bg-fog rounded pv-shimmer" />
          <div className={`mt-2 ${compact ? 'h-12 w-20' : 'h-16 w-24'} bg-fog rounded pv-shimmer`} />
          <div className="mt-2 h-3 w-16 bg-fog rounded pv-shimmer" />
        </div>
        <div className="h-7 w-28 bg-fog rounded-full pv-shimmer" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full bg-fog rounded pv-shimmer" />
        <div className="h-3 w-5/6 bg-fog rounded pv-shimmer" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-fog/50 rounded-md p-3 space-y-2">
          <div className="h-3 w-24 bg-fog rounded pv-shimmer" />
          <div className="h-5 w-16 bg-fog rounded pv-shimmer" />
        </div>
        <div className="bg-fog/50 rounded-md p-3 space-y-2">
          <div className="h-3 w-24 bg-fog rounded pv-shimmer" />
          <div className="h-5 w-16 bg-fog rounded pv-shimmer" />
        </div>
      </div>
    </div>
  );
}
