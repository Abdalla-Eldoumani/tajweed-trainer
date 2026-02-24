export default function PracticeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-full max-w-sm bg-gray-200 dark:bg-gray-700 rounded mt-2" />
      </div>
      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}
