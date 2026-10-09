"use client";

import { memo } from "react";
import Link from "next/link";
import { ArabicText } from "@/components/ui/ArabicText";
import { Medallion } from "@/components/ui/Medallion";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { LearningModule } from "@/lib/types";

interface ModuleCardProps {
  module: LearningModule;
  lessonDone: boolean;
  quizScore: number | null;
  locked?: boolean;
}

export const ModuleCard = memo(function ModuleCard({ module, lessonDone, quizScore, locked = false }: ModuleCardProps) {
  const { t, isAr } = useTranslation();

  const title = isAr ? module.title_ar : module.title_en;
  const subtitle = isAr ? module.title_en : module.title_ar;
  const desc = isAr && module.description_ar ? module.description_ar : module.description;

  const status = locked
    ? t("learn.locked")
    : lessonDone
      ? t("common.completed")
      : t("learn.notStarted");

  const content = (
    <div className={cn("flex items-start gap-4 py-5 px-2", locked && "grayscale")}>
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
          {locked && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
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
  );

  if (locked) {
    return <div className="cursor-not-allowed">{content}</div>;
  }

  return (
    <Link href={`/learn/${module.id}`} className="block transition-colors hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark">
      {content}
    </Link>
  );
});

ModuleCard.displayName = "ModuleCard";
