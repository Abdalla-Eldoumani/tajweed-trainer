"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  showLabel?: boolean;
  // Accessible name for the progressbar; defaults to the generic "Progress".
  label?: string;
}

export function ProgressBar({ value, max = 100, className, color, showLabel = false, label }: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  const { t } = useTranslation();

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>{t("common.progress")}</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-full bg-bg-subtle dark:bg-bg-subtle-dark overflow-hidden motion-reduce:transition-none"
        role="progressbar"
        aria-label={label ?? t("common.progress")}
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percentage}% complete`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
          style={{
            width: `${percentage}%`,
            // Lapis (light) / gold (dark) via the CSS var; the old green
            // default was a repalette miss.
            backgroundColor: color ?? "var(--primary)",
          }}
        />
      </div>
    </div>
  );
}
