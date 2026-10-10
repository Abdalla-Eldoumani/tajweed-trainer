"use client";

import { memo } from "react";
import Link from "next/link";
import { ArabicText } from "@/components/ui/ArabicText";
import { Medallion } from "@/components/ui/Medallion";
import { useTranslation } from "@/lib/i18n";
import type { LearningModule } from "@/lib/types";

interface ModuleCardProps {
  module: LearningModule;
  lessonDone: boolean;
  quizScore: number | null;
}

export const ModuleCard = memo(function ModuleCard({ module, lessonDone, quizScore }: ModuleCardProps) {
  const { t, isAr } = useTranslation();

  const title = isAr ? module.title_ar : module.title_en;
  const subtitle = isAr ? module.title_en : module.title_ar;
  const desc = isAr && module.description_ar ? module.description_ar : module.description;

  const status = lessonDone ? t("common.completed") : t("learn.notStarted");

  return (
    <Link href={`/learn/${module.id}`} className="block transition-colors hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark">
      <div className="flex items-start gap-4 py-5 px-2">
        <Medallion n={module.order} />

        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-semibold text-body">{title}</h2>
          {isAr ? (
            <p className="text-micro text-text-muted">{subtitle}</p>
          ) : (
            <ArabicText text={subtitle} size="sm" className="text-text-muted" />
          )}

          <p className="text-small text-text-muted mt-1.5 line-clamp-2">{desc}</p>

          <p className="mt-2 flex items-center gap-2 text-micro text-text-muted">
            {lessonDone && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary dark:text-primary-light" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            <span>{status}</span>
            {quizScore !== null && <span>{t("progress.latestQuiz")}: {quizScore}%</span>}
          </p>
        </div>
      </div>
    </Link>
  );
});

ModuleCard.displayName = "ModuleCard";
