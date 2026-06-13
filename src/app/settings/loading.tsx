export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-36 bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
        <div className="h-4 w-full max-w-sm bg-bg-subtle dark:bg-bg-subtle-dark rounded mt-2" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-bg-subtle dark:bg-bg-subtle-dark rounded-xl" />
        ))}
      </div>
    </div>
  );
}
