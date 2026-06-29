export default function Loading() {
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 max-w-5xl" aria-busy="true" aria-live="polite">
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-20 bg-fog rounded" />
        <div className="flex items-baseline gap-3">
          <div className="h-12 w-28 bg-fog rounded" />
          <div className="h-3 w-32 bg-fog rounded" />
        </div>
        <div className="h-3 w-48 bg-fog rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2 animate-pulse">
        <div className="h-10 bg-fog rounded" />
        <div className="h-10 bg-fog rounded" />
      </div>
      <div className="pv-card p-4 sm:p-5 animate-pulse space-y-3">
        <div className="h-3 w-24 bg-fog rounded" />
        <div className="h-12 w-20 bg-fog rounded" />
        <div className="h-3 w-full bg-fog rounded" />
        <div className="h-3 w-3/4 bg-fog rounded" />
      </div>
      <div className="pv-card p-4 animate-pulse">
        <div className="h-40 bg-fog rounded" />
      </div>
    </div>
  );
}
