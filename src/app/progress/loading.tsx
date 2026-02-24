export default function ProgressLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-full max-w-sm bg-gray-200 dark:bg-gray-700 rounded mt-2" />
      </div>
      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
