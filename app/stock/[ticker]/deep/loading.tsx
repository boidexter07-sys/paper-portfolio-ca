export default function Loading() {
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl" aria-busy="true" aria-live="polite">
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-32 bg-fog rounded" />
        <div className="h-10 w-56 bg-fog rounded" />
        <div className="h-3 w-72 max-w-full bg-fog rounded" />
      </div>
      <div className="pv-card p-5 sm:p-6 animate-pulse space-y-3">
        <div className="h-3 w-24 bg-fog rounded" />
        <div className="h-12 w-20 bg-fog rounded" />
        <div className="h-3 w-full bg-fog rounded" />
      </div>
      <div className="pv-card animate-pulse divide-y divide-fog">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-fog rounded" />
              <div className="h-3 w-24 bg-fog rounded" />
            </div>
            <div className="h-6 w-12 bg-fog rounded" />
          </div>
        ))}
      </div>
      <div className="pv-card p-4 animate-pulse">
        <div className="h-40 bg-fog rounded" />
      </div>
    </div>
  );
}
