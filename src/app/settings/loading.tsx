export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-full max-w-sm bg-gray-200 dark:bg-gray-700 rounded mt-2" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
