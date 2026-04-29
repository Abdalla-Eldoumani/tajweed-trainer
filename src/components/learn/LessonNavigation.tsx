"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

type LocaleLabel = string | { en: string; ar?: string };

interface LessonNavigationProps {
  prevHref?: string;
  prevLabel?: LocaleLabel;
  nextHref?: string;
  nextLabel?: LocaleLabel;
  onMarkComplete?: () => void;
  isComplete?: boolean;
}

function pickLabel(label: LocaleLabel | undefined, isAr: boolean): string | undefined {
  if (!label) return undefined;
  if (typeof label === "string") return label;
  return isAr && label.ar ? label.ar : label.en;
}

const ChevronStartIcon = ({ className }: { className?: string }) => (
  // Points start (visually back). In RTL, rotates so it still points back.
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronEndIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export function LessonNavigation({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  onMarkComplete,
  isComplete,
}: LessonNavigationProps) {
  const { t, isAr } = useTranslation();

  const prevText = pickLabel(prevLabel, isAr) ?? t("common.previous");
  const nextText = pickLabel(nextLabel, isAr) ?? t("common.next");

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-6 mt-6">
      <div className="gold-divider absolute -top-px left-0 right-0" />
      <div className="w-full sm:w-auto">
        {prevHref && (
          <Link href={prevHref}>
            <Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px] gap-2">
              <ChevronStartIcon />
              {prevText}
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {onMarkComplete && (
          <Button
            variant={isComplete ? "secondary" : "primary"}
            size="sm"
            onClick={onMarkComplete}
            disabled={isComplete}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {isComplete ? t("common.completed") : t("common.markComplete")}
          </Button>
        )}

        {nextHref && (
          <Link href={nextHref} className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px] gap-2">
              {nextText}
              <ChevronEndIcon />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
