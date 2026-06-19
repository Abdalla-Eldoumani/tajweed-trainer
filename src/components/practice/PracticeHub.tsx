"use client";

import { useEffect, useMemo, useState } from "react";
import { StreakCounter } from "@/components/practice/StreakCounter";
import { PracticeModuleCard } from "@/components/practice/PracticeModuleCard";
import { useTranslation } from "@/lib/i18n";
import { useProgress } from "@/hooks/useProgress";
import { useReviews } from "@/hooks/useReviews";
import { MODULES } from "@/components/layout/nav-data";
import { getModuleLastScore } from "@/lib/practice-scores";
import { getLockedModuleIds } from "@/lib/module-unlock";

interface PracticeHubProps {
  // Per-module question counts, computed server-side from the question pool so
  // the content never reaches the client bundle. Total drives the Mixed tile.
  counts: Record<string, number>;
  totalQuestions: number;
}

export function PracticeHub({ counts, totalQuestions }: PracticeHubProps) {
  const { t } = useTranslation();
  const { progress } = useProgress();
  const { stats } = useReviews();
  const reviewStats = stats();

  // Locks render only after mount so the server HTML and the first client
  // paint agree; the route itself gates regardless.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const lockedModuleIds = useMemo(() => {
    if (!mounted) return new Set<string>();
    return getLockedModuleIds(progress);
  }, [mounted, progress]);

  const mixedSummary = getModuleLastScore(progress, "mixed");
  const reviewSummary = getModuleLastScore(progress, "review");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-h2 font-bold">{t("practice.hub.title")}</h1>
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
        {reviewStats.due > 0 && (
          <PracticeModuleCard
            href="/practice/review"
            titleEn={`Review Due (${reviewStats.due})`}
            titleAr={`مراجعة مستحقّة (${reviewStats.due})`}
            questionCount={reviewStats.due}
            summary={reviewSummary}
            accent="review"
            description={{ en: t("practice.hub.reviewDesc"), ar: t("practice.hub.reviewDesc") }}
            badge={{ en: t("practice.hub.reviewBadge"), ar: t("practice.hub.reviewBadge") }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map((mod) => {
          const count = counts[mod.id] ?? 0;
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
              locked={lockedModuleIds.has(mod.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
