"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TajweedText } from "@/components/ui/TajweedText";
import { useTranslation } from "@/lib/i18n";
import { getSnapshotKeys, getVerseSnapshotByKey } from "@/lib/verse-snapshots";
import { pageForSurah } from "@/lib/navigation";
import { formatSurahReference } from "@/lib/utils";
import surahIndex from "@/data/content/surah-index.json";
import type { SurahHeader } from "@/lib/types";

const INDEX = surahIndex as SurahHeader[];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

// One real verse per day, drawn from the pre-fetched authenticated snapshot set
// (never generated). The pick is made after mount so the day computation cannot
// cause an SSR/CSR hydration mismatch.
export function DailyVerse() {
  const { t, lang } = useTranslation();
  const [verseKey, setVerseKey] = useState<string | null>(null);

  useEffect(() => {
    const keys = getSnapshotKeys();
    if (keys.length) setVerseKey(keys[dayOfYear(new Date()) % keys.length]);
  }, []);

  if (!verseKey) return null;
  const snap = getVerseSnapshotByKey(verseKey);
  if (!snap) return null;

  const [surah, ayah] = verseKey.split(":").map(Number);
  const meta = INDEX.find((s) => s.number === surah);

  return (
    <Card>
      <h2 className="font-heading font-semibold text-sm mb-3">{t("home.dailyVerse")}</h2>
      <div className="text-center overflow-x-auto">
        <TajweedText tajweedHtml={snap.tajweedHtml} size="lg" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-text-muted">
          {meta
            ? formatSurahReference({ en: meta.nameSimple, ar: meta.nameArabic }, surah, ayah, lang)
            : verseKey}
        </span>
        <Link
          href={`/mushaf/page/${pageForSurah(surah)}?v=${surah}:${ayah}`}
          className="text-xs text-primary dark:text-primary-light hover:underline shrink-0"
        >
          {t("lesson.openInReader")}
        </Link>
      </div>
    </Card>
  );
}
