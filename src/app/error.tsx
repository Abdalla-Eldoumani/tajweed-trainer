"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

// Route-segment error boundary. Catches render/runtime errors in any page and
// replaces the blank screen with a friendly, localized recovery surface: a
// "try again" that re-runs the segment via reset(), plus a link home. Copy is
// UI-only (error.* keys); the raw error object is logged, never shown.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="font-heading text-2xl font-bold mb-2">{t("error.title")}</h1>
      <p className="text-sm text-text-muted mb-6 max-w-sm">{t("error.body")}</p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>{t("error.retry")}</Button>
        <Link href="/">
          <Button variant="outline">{t("error.goHome")}</Button>
        </Link>
      </div>
    </div>
  );
}
