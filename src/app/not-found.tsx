"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="font-arabic text-arabic-xl text-primary/20 dark:text-primary-light/20 mb-2" dir="rtl" lang="ar">
        ٤٠٤
      </p>
      <h1 className="font-heading text-2xl font-bold mb-2">{t("notFound.title")}</h1>
      <p className="text-sm text-text-muted mb-6 max-w-sm">
        {t("notFound.description")}
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t("notFound.goHome")}
        </Link>
        <Link
          href="/learn"
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark transition-colors"
        >
          {t("notFound.startLearning")}
        </Link>
      </div>
    </div>
  );
}
