import Link from "next/link";

export const metadata = {
  title: "Page Not Found | Tajweed Trainer",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="font-arabic text-arabic-xl text-primary/20 dark:text-primary-light/20 mb-2" dir="rtl" lang="ar">
        ٤٠٤
      </p>
      <h1 className="font-heading text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-sm text-text-muted mb-6 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/learn"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Start Learning
        </Link>
      </div>
    </div>
  );
}
