export default function PracticeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-36 bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
        <div className="h-4 w-full max-w-sm bg-bg-subtle dark:bg-bg-subtle-dark rounded mt-2" />
      </div>
      <div className="h-20 bg-bg-subtle dark:bg-bg-subtle-dark rounded-xl" />
      <div className="h-10 w-48 bg-bg-subtle dark:bg-bg-subtle-dark rounded-lg" />
      <div className="h-64 bg-bg-subtle dark:bg-bg-subtle-dark rounded-xl" />
    </div>
  );
}
