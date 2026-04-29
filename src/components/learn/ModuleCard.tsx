"use client";

import { memo } from "react";
import Link from "next/link";
import { ArabicText } from "@/components/ui/ArabicText";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { LearningModule } from "@/lib/types";

interface ModuleCardProps {
  module: LearningModule;
  completedLessons: number;
  locked?: boolean;
}

const MODULE_ICONS: Record<string, string> = {
  mouth: "M",
  noon: "ن",
  meem: "م",
  sound: "~",
  echo: "Q",
  stretch: "~",
  letters: "ل",
  weight: "W",
  pause: "||",
};

export const ModuleCard = memo(function ModuleCard({ module, completedLessons, locked = false }: ModuleCardProps) {
  const progress = module.lessons_count > 0 ? (completedLessons / module.lessons_count) * 100 : 0;
  const { t, isAr } = useTranslation();

  const title = isAr ? module.title_ar : module.title_en;
  const subtitle = isAr ? module.title_en : module.title_ar;
  const desc = isAr && module.description_ar ? module.description_ar : module.description;

  const content = (
    <Card hover={!locked} className={cn("relative", locked && "opacity-60")}>
      {locked && (
        <div className="absolute top-3 end-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gold-light/20 text-gold-dark dark:bg-gold-dark/20 dark:text-gold-light text-lg font-bold font-arabic shrink-0 border border-gold-light/30 dark:border-gold-dark/30">
          {MODULE_ICONS[module.icon] ?? module.order}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gold-dark dark:text-gold-light font-medium">
              {module.order}
            </span>
          </div>

          <h3 className="font-heading font-semibold text-sm mb-0.5">
            {title}
          </h3>
          {isAr ? (
            <p className="text-xs text-text-muted">{subtitle}</p>
          ) : (
            <ArabicText text={subtitle} size="sm" className="text-text-muted" />
          )}

          <p className="text-xs text-text-muted mt-2 line-clamp-2">
            {desc}
          </p>

          <div className="mt-3">
            <ProgressBar value={completedLessons} max={module.lessons_count} showLabel />
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span>{module.lessons_count} {t("learn.lessons")}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  if (locked) {
    return <div className="cursor-not-allowed">{content}</div>;
  }

  return <Link href={`/learn/${module.id}`}>{content}</Link>;
});

ModuleCard.displayName = "ModuleCard";
