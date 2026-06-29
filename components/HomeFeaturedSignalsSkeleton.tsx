export function HomeFeaturedSignalsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="pv-card p-4">
          <div className="flex items-baseline justify-between">
            <div className="h-5 w-16 bg-fog rounded pv-shimmer" />
            <div className="h-3 w-10 bg-fog rounded pv-shimmer" />
          </div>
          <div className="h-3 w-40 bg-fog rounded pv-shimmer mt-3 mb-3" />
          <div className="flex items-baseline gap-3">
            <div className="h-8 w-12 bg-fog rounded pv-shimmer" />
            <div className="h-3 w-24 bg-fog rounded pv-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}