"use client";

import { Card } from "@/components/ui/Card";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StreakCounter() {
  const { progress } = useProgress();
  const { t } = useTranslation();
  const { currentStreak, longestStreak, lastPracticeDate } = progress.streaks;

  // Streak dates are stored as local day strings (toLocaleDateString("en-CA")),
  // so the calendar computes and compares in local days end to end — otherwise a
  // user near local midnight could see "today" highlighted on the wrong pill.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toLocaleDateString("en-CA");
    const isToday = dateStr === todayStr;

    let isPracticed = false;
    if (lastPracticeDate && currentStreak > 0) {
      const streakStart = new Date(lastPracticeDate + "T00:00:00");
      streakStart.setDate(streakStart.getDate() - (currentStreak - 1));
      const streakStartStr = streakStart.toLocaleDateString("en-CA");
      isPracticed = dateStr >= streakStartStr && dateStr <= lastPracticeDate;
    }

    return { dateStr, isToday, isPracticed, dayLabel: t(`weekday.short.${date.getDay()}`) };
  });

  return (
    <Card>
      <h2 className="font-heading font-semibold text-sm mb-3">{t("practice.streak")}</h2>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary dark:text-primary-light tabular-nums">{currentStreak}</div>
          <p className="text-xs text-text-muted">{t("practice.currentStreak")}</p>
        </div>
        <div className="w-px h-12 bg-gold-light/30 dark:bg-gold-dark/20" />
        <div className="text-center">
          <div className="text-3xl font-bold text-accent tabular-nums">{longestStreak}</div>
          <p className="text-xs text-text-muted">{t("practice.longestStreak")}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1 justify-center">
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "w-8 h-8 rounded flex items-center justify-center text-[10px] font-medium",
              day.isPracticed
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
    </Card>
  );
}
