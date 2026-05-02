"use client";

import { StreakCounter } from "@/components/practice/StreakCounter";
import { PracticeModuleCard } from "@/components/practice/PracticeModuleCard";
import { useTranslation } from "@/lib/i18n";
import { useProgress } from "@/hooks/useProgress";
import { MODULES } from "@/components/layout/nav-data";
import { getAvailableModules, getModuleLastScore } from "@/lib/question-pool";

export default function PracticePage() {
  const { t } = useTranslation();
  const { progress } = useProgress();
  const availableModules = getAvailableModules();
  const moduleCountById = new Map(availableModules.map((m) => [m.id, m.count]));
  const totalQuestions = availableModules.reduce((acc, m) => acc + m.count, 0);

  const mixedSummary = getModuleLastScore(progress, "mixed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("practice.hub.title")}</h1>
        <p className="text-sm text-text-muted mt-2">{t("practice.hub.subtitle")}</p>
      </div>

      <StreakCounter />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PracticeModuleCard
          href="/practice/mixed"
          titleEn="Mixed Review"
          titleAr="مراجعة مختلطة"
          questionCount={totalQuestions}
          summary={mixedSummary}
          accent="mixed"
          description={{ en: t("practice.hub.mixedDesc"), ar: t("practice.hub.mixedDesc") }}
          badge={{ en: t("practice.hub.mixedBadge"), ar: t("practice.hub.mixedBadge") }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map((mod) => {
          const count = moduleCountById.get(mod.id) ?? 0;
          if (count === 0) return null;
          const summary = getModuleLastScore(progress, mod.id);
          return (
            <PracticeModuleCard
              key={mod.id}
              href={`/practice/${mod.id}`}
              titleEn={mod.label}
              titleAr={mod.labelAr}
              questionCount={count}
              summary={summary}
            />
          );
        })}
      </div>
    </div>
  );
}
