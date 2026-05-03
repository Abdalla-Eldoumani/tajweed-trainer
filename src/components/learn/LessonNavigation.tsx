"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";
import { useModuleLock } from "@/hooks/useModuleLock";

type LocaleLabel = string | { en: string; ar?: string };

interface LessonNavigationProps {
  prevHref?: string;
  prevLabel?: LocaleLabel;
  nextHref?: string;
  nextLabel?: LocaleLabel;
  onMarkComplete?: () => void;
  isComplete?: boolean;
  // When set, renders a "Practice this module" CTA below the row that links to
  // /practice/<id>. The CTA is suppressed while the module is still locked,
  // matching the gating behavior in /learn/<id>.
  practiceModuleId?: string;
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
  practiceModuleId,
}: LessonNavigationProps) {
  const { t, isAr } = useTranslation();
  // Pass an empty string when no practice module is set so the hook still
  // runs unconditionally (React rules-of-hooks), but the result is unused.
  const lockState = useModuleLock(practiceModuleId ?? "");
  const showPracticeCta = !!practiceModuleId && lockState.mounted && !lockState.locked;

  const prevText = pickLabel(prevLabel, isAr) ?? t("common.previous");
  const nextText = pickLabel(nextLabel, isAr) ?? t("common.next");

  return (
    <div className="pt-6 mt-6 space-y-4">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      {showPracticeCta && (
        <Link href={`/practice/${practiceModuleId}`} className="block">
          <Button variant="primary" size="md" className="w-full min-h-[44px] gap-2">
            {t("learn.practiceThisModule")}
            <ChevronEndIcon />
          </Button>
        </Link>
      )}
    </div>
  );
}
