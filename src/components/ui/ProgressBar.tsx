"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, className, color, showLabel = false }: ProgressBarProps) {
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
        className="h-2 w-full rounded-full bg-bg-subtle dark:bg-bg-subtle-dark overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percentage}% complete`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color ?? "#1B5E20",
          }}
        />
      </div>
    </div>
  );
}
