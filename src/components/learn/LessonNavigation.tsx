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
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
      <div>
        {prevHref && (
          <Link href={prevHref}>
            <Button variant="ghost" size="sm">
              &larr; {prevLabel ?? "Previous"}
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onMarkComplete && (
          <Button
            variant={isComplete ? "secondary" : "primary"}
            size="sm"
            onClick={onMarkComplete}
            disabled={isComplete}
          >
            {isComplete ? "Completed" : "Mark Complete"}
          </Button>
        )}

        {nextHref && (
          <Link href={nextHref}>
            <Button variant="outline" size="sm">
              {nextLabel ?? "Next"} &rarr;
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
