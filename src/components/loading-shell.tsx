export function LoadingShell() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="loading-shimmer h-10 w-72 rounded-[8px]" />
          <div className="loading-shimmer h-5 w-96 max-w-full rounded-[8px]" />
        </div>
        <div className="loading-shimmer h-12 w-40 rounded-[8px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="loading-shimmer h-4 w-24 rounded-[8px]" />
            <div className="loading-shimmer mt-5 h-9 w-16 rounded-[8px]" />
            <div className="loading-shimmer mt-4 h-4 w-32 rounded-[8px]" />
          </div>
        ))}
      </div>

      <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="loading-shimmer h-5 w-44 rounded-[8px]" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="loading-shimmer h-28 rounded-[8px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
