"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useTranslation } from "@/lib/i18n";

const QuizSession = dynamic(
  () => import("@/components/practice/QuizSession").then((mod) => ({ default: mod.QuizSession })),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />,
  },
);

export default function MixedPracticePage() {
  const { t, isAr } = useTranslation();

  return (
    <div className="space-y-6">
      <Link
        href="/practice"
        className="text-sm text-primary dark:text-primary-light hover:underline inline-flex items-center min-h-[44px]"
      >
        {isAr ? "→ " : "← "}
        {t("practice.hub.backToHub")}
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-bold">{t("practice.hub.mixedTitle")}</h1>
        <p className="text-sm text-text-muted mt-2">{t("practice.hub.mixedDesc")}</p>
      </div>

      <QuizSession mode="random" />
    </div>
  );
}
