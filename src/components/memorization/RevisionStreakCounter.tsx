"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { cn, toArabicIndic } from "@/lib/utils";

// The memorization revision streak: mirrors the practice StreakCounter
// but reads progress.memorizationStreak (the separate field the storage layer
// tracks and the recall path updates on every graded verse). It carries a
// DISTINCT label so it never reads as — or collides in an e2e locator with — the
// practice streak card lower on /progress.
export function RevisionStreakCounter() {
  const { progress } = useProgress();
  const { t, isAr } = useTranslation();

  // Store-derived UI gates on a mounted flag so the first client paint matches
  // the server's empty snapshot (streak 0), mirroring the directory rule and the
  // practice StreakCounter idiom. The field is optional, so a safe
  // default covers the never-revised case too.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { currentStreak, longestStreak, lastRevisionDate } =
    (mounted && progress.memorizationStreak) || {
      currentStreak: 0,
      longestStreak: 0,
      lastRevisionDate: "",
    };

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // Streak dates are stored as local day strings (toLocaleDateString("en-CA")),
  // so the 7-day calendar computes and compares in local days end to end (same
  // as the practice StreakCounter), otherwise a user near local midnight could
  // see "today" highlighted on the wrong pill.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toLocaleDateString("en-CA");
    const isToday = dateStr === todayStr;

    let isRevised = false;
    if (lastRevisionDate && currentStreak > 0) {
      const streakStart = new Date(lastRevisionDate + "T00:00:00");
      streakStart.setDate(streakStart.getDate() - (currentStreak - 1));
      const streakStartStr = streakStart.toLocaleDateString("en-CA");
      isRevised = dateStr >= streakStartStr && dateStr <= lastRevisionDate;
    }

    return { dateStr, isToday, isRevised, dayLabel: t(`weekday.short.${date.getDay()}`) };
  });

  return (
    <Card>
      <h2 className="font-heading font-semibold text-sm mb-3">{t("strength.revisionStreakTitle")}</h2>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-center">
          <div className="text-h1 font-bold text-primary dark:text-primary-light tabular-nums">
            {num(currentStreak)}
          </div>
          <p className="text-xs text-text-muted">{t("strength.revisionCurrent")}</p>
        </div>
        <div className="w-px h-12 bg-gold-light/30 dark:bg-gold-dark/20" />
        <div className="text-center">
          <div className="text-h1 font-bold text-accent tabular-nums">{num(longestStreak)}</div>
          <p className="text-xs text-text-muted">{t("strength.revisionLongest")}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1 justify-center">
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "w-8 h-8 rounded flex items-center justify-center text-[0.75rem] font-medium",
              day.isRevised
                ? "bg-primary/20 text-primary dark:bg-primary-light/20 dark:text-primary-light"
                : day.isToday
                ? "bg-bg-subtle dark:bg-bg-subtle-dark text-text"
                : "bg-cream dark:bg-bg-dark text-text-muted"
            )}
          >
            {day.dayLabel}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-text-muted">{t("strength.revisionStreakHelp")}</p>
    </Card>
  );
}
