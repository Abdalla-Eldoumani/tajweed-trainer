"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface LessonNavigationProps {
  prevHref?: string;
  prevLabel?: string;
  nextHref?: string;
  nextLabel?: string;
  onMarkComplete?: () => void;
  isComplete?: boolean;
}

export function LessonNavigation({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  onMarkComplete,
  isComplete,
}: LessonNavigationProps) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="w-full sm:w-auto">
        {prevHref && (
          <Link href={prevHref}>
            <Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">
              &larr; {prevLabel ?? "Previous"}
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
            {isComplete ? "Completed" : "Mark Complete"}
          </Button>
        )}

        {nextHref && (
          <Link href={nextHref} className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px]">
              {nextLabel ?? "Next"} &rarr;
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
