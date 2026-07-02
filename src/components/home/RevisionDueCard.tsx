"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useMemorization } from "@/hooks/useMemorization";
import { useMemorizationReviews } from "@/hooks/useMemorizationReviews";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic } from "@/lib/utils";

// The honest on-open revision card (REV-03): "N verses due for revision" linking
// to /progress, where the full dashboard and the recall session live. It shows
// the uncapped due total (the honest count) but renders ONLY when today's queue
// has something actionable (order.length > 0), so it never nags about verses the
// daily new-verse cap is holding for the coming days (that state is explained on
// the dashboard, not on the home card). Reads the SAME composeToday the dashboard
// and the recall session use. Renders nothing until mount, so the server's
// no-data render matches the first client paint (no flash).
export function RevisionDueCard() {
  const { t, isAr } = useTranslation();
  const { memorized, count, mounted } = useMemorization();
  const { composeToday } = useMemorizationReviews();

  // The composed daily queue, memoized on the memorized Set identity. Memorized is
  // empty until mount, so order/dueTotal are 0 pre-mount and the gate below keeps
  // the first client paint equal to the server's no-data render.
  const q = useMemo(() => composeToday(memorized), [composeToday, memorized]);

  if (!(mounted && count > 0 && q.order.length > 0)) return null;

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  return (
    <Link href="/progress" className="block">
      <Card hover className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium tabular-nums">
          {t("murajaah.homeDue").replace("{n}", num(q.dueTotal))}
        </p>
        <span className="flex items-center gap-1 text-primary dark:text-primary-light">
          <span className="text-sm font-medium">{t("murajaah.review")}</span>
          <span aria-hidden="true">{isAr ? "←" : "→"}</span>
        </span>
      </Card>
    </Link>
  );
}
