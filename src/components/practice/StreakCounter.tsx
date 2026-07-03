"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StreakCounter() {
  const { progress } = useProgress();
  const { t } = useTranslation();
  const { currentStreak, longestStreak, lastPracticeDate } = progress.streaks;

  // The 7-day weekday row derives from new Date(). A prerendered / or /progress is
  // built in whatever week the build ran, so computing the row before hydration
  // paints the build's week and mismatches the first client render once the week
  // rolls over (React #418). Defer it behind a mounted flag, mirroring
  // RevisionStreakCounter; until mounted, render 7 neutral pills so the layout is
  // stable and the server HTML equals the first client paint. The current/longest
  // figures come from the useSyncExternalStore-backed progress (hydration-safe),
  // so they render immediately.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Streak dates are stored as local day strings (toLocaleDateString("en-CA")),
  // so the calendar computes and compares in local days end to end, otherwise a
  // user near local midnight could see "today" highlighted on the wrong pill.
  const todayStr = mounted ? new Date().toLocaleDateString("en-CA") : "";
  const days = Array.from({ length: 7 }).map((_, i) => {
    if (!mounted) return { isToday: false, isPracticed: false, dayLabel: "" };

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

    return { isToday, isPracticed, dayLabel: t(`weekday.short.${date.getDay()}`) };
  });

  return (
    <Card>
      <h2 className="font-heading font-semibold text-sm mb-3">{t("practice.streak")}</h2>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-center">
          <div className="text-h1 font-bold text-primary dark:text-primary-light tabular-nums">{currentStreak}</div>
          <p className="text-xs text-text-muted">{t("practice.currentStreak")}</p>
        </div>
        <div className="w-px h-12 bg-gold-light/30 dark:bg-gold-dark/20" />
        <div className="text-center">
          <div className="text-h1 font-bold text-accent tabular-nums">{longestStreak}</div>
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
