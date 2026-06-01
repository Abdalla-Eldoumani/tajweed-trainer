"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n";
import { getLastRead } from "@/lib/storage";
import { toArabicIndic } from "@/lib/utils";
import type { VerseLocation } from "@/lib/types";

// Offers to resume the last read mushaf page. Read after mount (localStorage),
// so it stays null on the server and never hydration-mismatches.
export function ResumeReading() {
  const { t, isAr } = useTranslation();
  const [last, setLast] = useState<VerseLocation | null>(null);

  useEffect(() => setLast(getLastRead()), []);

  if (!last) return null;

  return (
    <Link href={`/mushaf/page/${last.page}`} className="block">
      <Card hover className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t("home.resumeReading")}</p>
          <p className="text-xs text-text-muted">
            {t("home.resumePage")} {isAr ? toArabicIndic(last.page) : last.page}
          </p>
        </div>
        <span aria-hidden="true" className="text-primary dark:text-primary-light">
          {isAr ? "←" : "→"}
        </span>
      </Card>
    </Link>
  );
}
