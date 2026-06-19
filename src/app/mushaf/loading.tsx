export default function MushafIndexLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      {/* Hero */}
      <div className="text-center py-6 rounded-xl space-y-3">
        <div className="h-9 w-40 mx-auto bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
        <div className="h-7 w-32 mx-auto bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
        <div className="h-4 w-full max-w-md mx-auto bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
      </div>

      {/* Surah grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-20 bg-bg-subtle dark:bg-bg-subtle-dark rounded-xl" />
        ))}
      </div>
    </div>
  );
}
