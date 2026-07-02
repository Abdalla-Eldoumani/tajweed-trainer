"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useMemorization } from "@/hooks/useMemorization";
import { useMemorizationReviews } from "@/hooks/useMemorizationReviews";
import { useTranslation } from "@/lib/i18n";
import { getMemorizationReviewStats } from "@/lib/memorization-review";
import { toArabicIndic } from "@/lib/utils";

// The honest on-open revision card (REV-03): "N verses due for revision" linking
// to /progress, where the full dashboard and the recall session live. Display
// only — the due count is the uncapped total from getMemorizationReviewStats, no
// queue math here. Renders nothing until mount and only when there is something
// due, so the server's no-data render matches the first client paint (no flash).
export function RevisionDueCard() {
  const { t, isAr } = useTranslation();
  const { memorized, count, mounted } = useMemorization();
  const { reviews } = useMemorizationReviews();

  // Cheap read over the memorized universe (a verse with no review entry is due);
  // computed before the gate but the gate below is what decides render.
  const due = getMemorizationReviewStats(memorized, reviews).due;

  if (!(mounted && count > 0 && due > 0)) return null;

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  return (
    <Link href="/progress" className="block">
      <Card hover className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium tabular-nums">
          {t("murajaah.homeDue").replace("{n}", num(due))}
        </p>
        <span className="flex items-center gap-1 text-primary dark:text-primary-light">
          <span className="text-sm font-medium">{t("murajaah.review")}</span>
          <span aria-hidden="true">{isAr ? "←" : "→"}</span>
        </span>
      </Card>
    </Link>
  );
}
