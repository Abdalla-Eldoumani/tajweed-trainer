"use client";

import { Card } from "@/components/ui/Card";
import { useProgress } from "@/hooks/useProgress";
import { cn } from "@/lib/utils";

export function StreakCounter() {
  const { progress } = useProgress();
  const { currentStreak, longestStreak, lastPracticeDate } = progress.streaks;

  // Build the last 7 days and determine which were practiced
  // A streak of N means the last N consecutive days (ending on lastPracticeDate) were practiced
  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    const isToday = i === 6;

    // The streak covers lastPracticeDate back (currentStreak - 1) days
    let isPracticed = false;
    if (lastPracticeDate && currentStreak > 0) {
      const lastDate = new Date(lastPracticeDate + "T00:00:00");
      const streakStart = new Date(lastDate);
      streakStart.setDate(streakStart.getDate() - (currentStreak - 1));
      const streakStartStr = streakStart.toISOString().split("T")[0];
      isPracticed = dateStr >= streakStartStr && dateStr <= lastPracticeDate;
    }

    return { dateStr, isToday, isPracticed, dayLabel: ["S", "M", "T", "W", "T", "F", "S"][date.getDay()] };
  });

  return (
    <Card>
      <h3 className="font-heading font-semibold text-sm mb-3">Practice Streak</h3>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary dark:text-primary-light">{currentStreak}</div>
          <p className="text-xs text-text-muted">Current Streak</p>
        </div>
        <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
        <div className="text-center">
          <div className="text-3xl font-bold text-accent">{longestStreak}</div>
          <p className="text-xs text-text-muted">Longest Streak</p>
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
                ? "bg-gray-100 dark:bg-gray-800 text-text"
                : "bg-gray-50 dark:bg-gray-900 text-text-muted"
            )}
          >
            {day.dayLabel}
          </div>
        ))}
      </div>
    </Card>
  );
}
