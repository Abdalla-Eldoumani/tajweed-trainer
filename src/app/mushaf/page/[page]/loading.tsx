export default function MushafPageLoading() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none">
      {/* Toolbar row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2">
          <div className="h-11 w-28 bg-bg-subtle dark:bg-bg-subtle-dark rounded-lg" />
          <div className="h-11 w-11 bg-bg-subtle dark:bg-bg-subtle-dark rounded-lg" />
          <div className="h-11 w-11 bg-bg-subtle dark:bg-bg-subtle-dark rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-11 w-24 bg-bg-subtle dark:bg-bg-subtle-dark rounded-lg" />
          <div className="h-11 w-20 bg-bg-subtle dark:bg-bg-subtle-dark rounded-lg" />
          <div className="h-11 w-11 bg-bg-subtle dark:bg-bg-subtle-dark rounded-lg" />
        </div>
      </div>

      {/* Mushaf-frame-shaped page body */}
      <div className="mushaf-frame">
        <div className="rounded-md p-5 sm:p-8 space-y-4">
          <div className="h-10 w-40 mx-auto bg-bg-subtle dark:bg-bg-subtle-dark rounded-lg" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-7 bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
            ))}
          </div>
        </div>
      </div>

      <div className="h-4 w-32 mx-auto bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
    </div>
  );
}
