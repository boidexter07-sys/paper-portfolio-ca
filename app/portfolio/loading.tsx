export default function Loading() {
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl" aria-busy="true" aria-live="polite">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-32 bg-fog rounded" />
        <div className="h-10 w-40 bg-fog rounded" />
        <div className="h-4 w-96 max-w-full bg-fog rounded" />
      </div>
      <div className="pv-card p-4 sm:p-5 animate-pulse">
        <div className="flex items-baseline justify-between">
          <div className="space-y-2">
            <div className="h-3 w-32 bg-fog rounded" />
            <div className="h-10 w-44 bg-fog rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-24 bg-fog rounded" />
            <div className="h-3 w-16 bg-fog rounded" />
          </div>
        </div>
      </div>
      <div className="pv-card p-4 sm:p-5 animate-pulse">
        <div className="h-5 w-40 bg-fog rounded mb-4" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-fog last:border-0">
            <div className="h-4 w-16 bg-fog rounded" />
            <div className="h-4 w-24 bg-fog rounded" />
            <div className="h-4 w-20 bg-fog rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
