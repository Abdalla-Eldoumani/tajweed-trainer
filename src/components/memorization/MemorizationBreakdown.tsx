"use client";

import { useMemo, useState } from "react";
import { ArabicText } from "@/components/ui/ArabicText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useTranslation } from "@/lib/i18n";
import {
  countInScope,
  versesForJuz,
  versesForSurah,
} from "@/lib/memorization-scope";
import { TOTAL_JUZ } from "@/lib/navigation";
import { toArabicIndic } from "@/lib/utils";
import surahIndex from "@/data/content/surah-index.json";
import type { SurahHeader } from "@/lib/types";

// Surahs in number order, from the bundled index (READ ONLY). Names and real
// ayah counts come from here; this component never edits or generates content.
const SURAHS = (surahIndex as SurahHeader[])
  .slice()
  .sort((a, b) => a.number - b.number);

interface MemorizationBreakdownProps {
  // The parent passes useMemorization().memorized; this component only reads it.
  memorized: Set<string>;
}

// Per-juz and per-surah memorization breakdown. Every share is a set
// intersection of the memorized Set with the scope's enumerated verseKeys
// (computed once per Set change in a single useMemo, never per render and never
// per verse). Bars are --primary on --bg-subtle (gold is the headline only); no
// cell is filled with gold.
export function MemorizationBreakdown({ memorized }: MemorizationBreakdownProps) {
  const { t, isAr } = useTranslation();
  const [showAllSurahs, setShowAllSurahs] = useState(false);

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // One pass over all 30 + 114 scopes, recomputed only when the memorized Set
  // identity changes (UI-SPEC B4: do not recompute 144 scopes on every render).
  const { juzRows, surahRows } = useMemo(() => {
    const juz = Array.from({ length: TOTAL_JUZ }, (_, i) => {
      const j = i + 1;
      const verses = versesForJuz(j);
      return { juz: j, count: countInScope(memorized, verses), total: verses.length };
    });
    const surah = SURAHS.map((s) => {
      const verses = versesForSurah(s.number);
      return {
        number: s.number,
        nameSimple: s.nameSimple,
        nameArabic: s.nameArabic,
        count: countInScope(memorized, verses),
        total: s.versesCount,
      };
    });
    return { juzRows: juz, surahRows: surah };
  }, [memorized]);

  const fmtJuzLabel = (j: number, x: number, y: number) =>
    t("memorize.juzShare")
      .replace("{n}", num(j))
      .replace("{x}", num(x))
      .replace("{y}", num(y));

  const fmtSurahLabel = (name: string, x: number, y: number) =>
    t("memorize.surahShare")
      .replace("{name}", name)
      .replace("{x}", num(x))
      .replace("{y}", num(y));

  // Default to surahs with progress; "show all" reveals the full 114 list. This
  // keeps the populated tracker short without ever horizontal-scrolling (B4).
  const surahsWithProgress = surahRows.filter((s) => s.count > 0);
  const visibleSurahs = showAllSurahs ? surahRows : surahsWithProgress;

  return (
    <div className="space-y-8">
      {/* By juz: a wrap-friendly 30-cell grid, 3 columns at 375px scaling up to
          5, so it reflows without horizontal scroll. */}
      <section aria-labelledby="memorize-byjuz">
        <SectionHeading as="h3" className="mb-3">
          <span id="memorize-byjuz">{t("memorize.byJuz")}</span>
        </SectionHeading>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {juzRows.map((row) => {
            const pct = row.total > 0 ? Math.round((row.count / row.total) * 100) : 0;
            return (
              <li
                key={row.juz}
                className="rounded-lg border border-border bg-bg-card p-2 dark:bg-bg-card-dark"
                aria-label={fmtJuzLabel(row.juz, row.count, row.total)}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-small font-medium tabular-nums">{num(row.juz)}</span>
                  <span className="text-micro text-text-muted tabular-nums">
                    {num(row.count)}/{num(row.total)}
                  </span>
                </div>
                {/* --primary mini-bar on --bg-subtle, never a gold cell fill. */}
                <div
                  className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle dark:bg-bg-subtle-dark"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-primary dark:bg-primary-light"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* By surah: a scannable list, name on the inline-start, count on the
          inline-end, the default --primary bar beneath each row. */}
      <section aria-labelledby="memorize-bysurah">
        <SectionHeading as="h3" className="mb-3">
          <span id="memorize-bysurah">{t("memorize.bySurah")}</span>
        </SectionHeading>
        <ul className="space-y-3">
          {visibleSurahs.map((row) => (
            <li key={row.number}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-small text-text-muted tabular-nums">{num(row.number)}.</span>
                  {isAr ? (
                    <ArabicText text={row.nameArabic} size="sm" className="truncate leading-tight" />
                  ) : (
                    <span className="truncate text-small font-medium">{row.nameSimple}</span>
                  )}
                </div>
                <span className="shrink-0 text-small text-text-muted tabular-nums">
                  {num(row.count)} / {num(row.total)}
                </span>
              </div>
              <ProgressBar
                value={row.count}
                max={row.total}
                label={fmtSurahLabel(isAr ? row.nameArabic : row.nameSimple, row.count, row.total)}
              />
            </li>
          ))}
        </ul>
        {!showAllSurahs && surahsWithProgress.length < surahRows.length && (
          <button
            type="button"
            onClick={() => setShowAllSurahs(true)}
            className="mt-4 min-h-[44px] text-small font-medium text-primary underline-offset-4 hover:underline dark:text-primary-light"
          >
            {t("memorize.showAllSurahs")}
          </button>
        )}
      </section>
    </div>
  );
}
