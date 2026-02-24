export default function LearnLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        <div className="h-4 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded mt-3" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
