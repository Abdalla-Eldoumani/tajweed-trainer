export default function LearnLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
        <div className="h-5 w-32 bg-bg-subtle dark:bg-bg-subtle-dark rounded mt-2" />
        <div className="h-4 w-full max-w-md bg-bg-subtle dark:bg-bg-subtle-dark rounded mt-3" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 bg-bg-subtle dark:bg-bg-subtle-dark rounded-xl" />
        ))}
      </div>
    </div>
  );
}
