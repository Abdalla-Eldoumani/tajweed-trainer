"use client";

import { memo } from "react";
import Link from "next/link";
import { ArabicText } from "@/components/ui/ArabicText";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n";
import { cn, toArabicIndic } from "@/lib/utils";
import type { ModuleScoreSummary } from "@/lib/practice-scores";

interface PracticeModuleCardProps {
  href: string;
  titleEn: string;
  titleAr: string;
  questionCount: number;
  summary: ModuleScoreSummary;
  // Optional accent variant for the Mixed Review and Review Due tiles so they
  // visually stand apart from the 9 module tiles without diverging from the
  // shared card primitive.
  accent?: "default" | "mixed" | "review";
  description?: { en: string; ar?: string };
  badge?: { en: string; ar?: string };
  // Lays the tile out as one row (details left, score and action right) for
  // the full-width slot above the module grid.
  wide?: boolean;
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-ok";
  if (score >= 60) return "text-warn";
  return "text-err";
}

export const PracticeModuleCard = memo(function PracticeModuleCard({
  href,
  titleEn,
  titleAr,
  questionCount,
  summary,
  accent = "default",
  description,
  badge,
  wide = false,
  className,
}: PracticeModuleCardProps) {
  const { t, isAr, lang } = useTranslation();
  const title = isAr ? titleAr : titleEn;
  const subtitle = isAr ? titleEn : titleAr;
  const desc = description ? (isAr && description.ar ? description.ar : description.en) : null;
  const badgeText = badge ? (isAr && badge.ar ? badge.ar : badge.en) : null;
  const fmtCount = lang === "ar" ? toArabicIndic(questionCount) : questionCount;
  const fmtTaken = lang === "ar" ? toArabicIndic(summary.quizzesTaken) : summary.quizzesTaken;
  const fmtScore = summary.lastScore !== null && lang === "ar" ? toArabicIndic(summary.lastScore) : summary.lastScore;

  const accentClasses =
    accent === "mixed"
      ? "border-accent/40 dark:border-accent/30"
      : accent === "review"
      ? "border-primary/40 dark:border-primary-light/30"
      : "";

  const card = (
      <Card hover className={`relative h-full ${accentClasses}`}>
        {badgeText && (
          <span className="absolute top-3 end-3 text-micro font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
            {badgeText}
          </span>
        )}

        <div className={cn("flex flex-col h-full gap-3", wide && "sm:flex-row sm:items-center sm:gap-8")}>
          <div className="flex flex-1 flex-col gap-3 self-stretch">
            <div>
              <h3 className="font-heading font-semibold text-base">{title}</h3>
              {isAr ? (
                <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
              ) : (
                <ArabicText text={subtitle} size="sm" className="text-text-muted mt-0.5" />
              )}
            </div>

            {desc && <p className="text-xs text-text-muted line-clamp-2">{desc}</p>}

            <div className="flex items-center gap-3 text-xs text-text-muted mt-auto pt-2">
              <span>
                {fmtCount} {t("practice.hub.questions")}
              </span>
              {summary.quizzesTaken > 0 && (
                <span aria-hidden className="text-text-muted">
                  {"•"}
                </span>
              )}
              {summary.quizzesTaken > 0 && (
                <span>
                  {fmtTaken} {t("practice.hub.taken")}
                </span>
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-between pt-2 border-t border-gold-light/30 dark:border-gold-dark/20",
              wide && "sm:w-64 sm:shrink-0 sm:flex-col sm:items-start sm:gap-2 sm:border-t-0 sm:border-s sm:ps-8 sm:pt-0",
            )}
          >
            <div className="text-xs">
              {summary.lastScore !== null ? (
                <span>
                  <span className="text-text-muted">{t("practice.hub.lastScore")}: </span>
                  <span className={`font-semibold ${scoreColor(summary.lastScore)}`}>{fmtScore}%</span>
                </span>
              ) : (
                <span className="text-text-muted">{t("practice.hub.notStarted")}</span>
              )}
            </div>
            <span className="text-xs font-medium text-primary dark:text-primary-light">
              {summary.lastScore !== null ? t("practice.hub.continue") : t("practice.hub.start")}
              <span aria-hidden className="ms-1">{isAr ? "←" : "→"}</span>
            </span>
          </div>
        </div>
      </Card>
  );

  return (
    <Link href={href} className={cn("block", className)}>
      {card}
    </Link>
  );
});

PracticeModuleCard.displayName = "PracticeModuleCard";
