"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { StreakCounter } from "@/components/practice/StreakCounter";
import { useTranslation } from "@/lib/i18n";
import { MODULES } from "@/components/layout/nav-data";

const QuizSession = dynamic(
  () => import("@/components/practice/QuizSession").then((mod) => ({ default: mod.QuizSession })),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />,
  }
);
import { getAvailableModules } from "@/lib/question-pool";

export default function PracticePage() {
  const { t, isAr } = useTranslation();
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const modules = getAvailableModules();

  const getModuleLabel = (id: string) => {
    const mod = MODULES.find((m) => m.id === id);
    return mod ? (isAr ? mod.labelAr : mod.label) : id;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("practice.title")}</h1>
        <p className="text-sm text-text-muted mt-2">
          {t("practice.description")}
        </p>
      </div>

      <StreakCounter />

      <div>
        <label htmlFor="module-filter" className="text-sm font-medium block mb-2">
          {t("practice.filterByModule")}
        </label>
        <select
          id="module-filter"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 min-h-[44px] rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark text-sm"
        >
          <option value="">{t("practice.allModules")}</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {getModuleLabel(m.id)} ({m.count})
            </option>
          ))}
        </select>
      </div>

      <QuizSession key={moduleFilter} moduleFilter={moduleFilter || undefined} />
    </div>
  );
}
