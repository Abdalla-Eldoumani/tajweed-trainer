"use client";

import { useMemo, useState } from "react";
import { ArabicText } from "@/components/ui/ArabicText";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useTranslation } from "@/lib/i18n";
import { useMemorization } from "@/hooks/useMemorization";
import { useMemorizationReviews } from "@/hooks/useMemorizationReviews";
import { scopeStrength, type ScopeStrength } from "@/lib/memorization-strength";
import { versesForJuz, versesForSurah } from "@/lib/memorization-scope";
import {
  PAGE_STARTS,
  TOTAL_JUZ,
  lastVerseOfPage,
  nextVerse,
  pageForVerse,
} from "@/lib/navigation";
import { cn, toArabicIndic } from "@/lib/utils";
import surahIndex from "@/data/content/surah-index.json";
import type { SurahHeader } from "@/lib/types";

// Surahs in number order, from the bundled index (READ ONLY). Names and ayah
// counts come from here; this component never edits or generates content.
const SURAHS = (surahIndex as SurahHeader[])
  .slice()
  .sort((a, b) => a.number - b.number);

// The offline verseKeys of one mushaf page: the span from its first verse
// (PAGE_STARTS) through its last (lastVerseOfPage), walked with nextVerse. Built
// from navigation's verified tables — never hand-authored — so the page
// dimension carries no guessed structural metadata.
function versesForPage(page: number): string[] {
  const [startSurah, startAyah] = PAGE_STARTS[page - 1];
  const lastKey = lastVerseOfPage(page);
  const out: string[] = [];
  let cur: string | null = `${startSurah}:${startAyah}`;
  while (cur) {
    out.push(cur);
    if (cur === lastKey) break;
    const [s, a] = cur.split(":").map(Number);
    cur = nextVerse(s, a);
  }
  return out;
}

type FreshnessBucket = "fresh" | "aging" | "overdue" | "unseen";

// aggregate freshness for a scope. Unseen (memorized but never recalled)
// verses count as freshness 0, so a single fresh verse can never mask a scope
// that is mostly unrecalled: `avgFreshness` is over the reviewed verses only, so
// we scale it back down by the reviewed share of the memorized total. A scope
// with no reviewed verses at all is "unseen" (needs recall), read distinctly
// from one that was recalled and decayed to red ("overdue").
function effectiveFreshness(ss: ScopeStrength): number {
  if (ss.count === 0) return 0;
  return (ss.avgFreshness * ss.memorized) / ss.count;
}

function freshnessBucket(ss: ScopeStrength): FreshnessBucket {
  if (ss.memorized === 0) return "unseen";
  const f = effectiveFreshness(ss);
  if (f > 0.66) return "fresh";
  if (f >= 0.33) return "aging";
  return "overdue";
}

// Bucketed (never a continuous gradient) fill for the freshness bar, drawn only
// from the manuscript palette: lapis (fresh) -> gold (aging) -> ochre (overdue),
// with a faint ochre for the never-recalled "unseen" scope. NO new color token.
function freshnessBarClass(bucket: FreshnessBucket): string {
  switch (bucket) {
    case "fresh":
      return "bg-primary dark:bg-primary-light";
    case "aging":
      return "bg-gold";
    case "overdue":
      return "bg-accent";
    default:
      return "bg-accent/25";
  }
}

// Error intensity as a small set of ochre opacity buckets over the card ground
// (the ProgressBar swatch idiom, not text-on-a-saturated-fill). Zero errors read
// as the calm --bg-subtle track. Literal class strings so Tailwind emits them.
function errorBarClass(errorTotal: number, max: number): string {
  if (errorTotal <= 0 || max <= 0) return "bg-bg-subtle dark:bg-bg-subtle-dark";
  const r = errorTotal / max;
  if (r > 0.75) return "bg-accent/80";
  if (r > 0.5) return "bg-accent/60";
  if (r > 0.25) return "bg-accent/40";
  return "bg-accent/20";
}

const FRESHNESS_LEGEND: ReadonlyArray<readonly [FreshnessBucket, string]> = [
  ["fresh", "bg-primary dark:bg-primary-light"],
  ["aging", "bg-gold"],
  ["overdue", "bg-accent"],
  ["unseen", "bg-accent/25"],
];

// freshness facet + surah/juz/page error heatmap. Reads the pure
// `memorization-strength` lib over the memorized set and the reviews map; renders
// only scope names, counts, and manuscript-palette colors — never verse text.
export function MemorizationHeatmap() {
  const { t, isAr } = useTranslation();
  const { memorized, mounted } = useMemorization();
  const { reviews } = useMemorizationReviews();
  const [showAllSurahs, setShowAllSurahs] = useState(false);

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // ONE memoized pass over the 30 juz, the 114 surahs, and every page that holds
  // a memorized verse, recomputed only when the memorized Set or the reviews map
  // change (never per render). `now` is read once here and passed into every
  // scopeStrength call so the whole snapshot shares a single clock.
  const { juzRows, surahRows, pageRows } = useMemo(() => {
    const now = new Date();
    // Only the memorized verses matter, so intersect each scope with the set
    // before the strength pass — errors and freshness describe what the learner
    // has actually committed, not the whole scope.
    const build = (verses: string[]): ScopeStrength =>
      scopeStrength(verses.filter((k) => memorized.has(k)), reviews, now);

    const juz = Array.from({ length: TOTAL_JUZ }, (_, i) => {
      const j = i + 1;
      return { juz: j, ss: build(versesForJuz(j)) };
    });

    const surah = SURAHS.map((s) => ({
      number: s.number,
      nameSimple: s.nameSimple,
      nameArabic: s.nameArabic,
      ss: build(versesForSurah(s.number)),
    }));

    // Pages that contain a memorized verse, found by grouping the set through
    // pageForVerse, then scored over the page's full enumerated span.
    const pagesWithMem = new Set<number>();
    for (const key of memorized) {
      const [s, a] = key.split(":").map(Number);
      pagesWithMem.add(pageForVerse(s, a));
    }
    const page = Array.from(pagesWithMem)
      .sort((a, b) => a - b)
      .map((p) => ({ page: p, ss: build(versesForPage(p)) }));

    return { juzRows: juz, surahRows: surah, pageRows: page };
  }, [memorized, reviews]);

  // Store-derived UI: match the server's empty first paint (the mount site also
  // gates on memorizedMounted && count > 0, so this only renders once populated).
  if (!mounted) return null;

  const juzMem = juzRows.filter((r) => r.ss.count > 0);
  const surahMem = surahRows.filter((r) => r.ss.count > 0);

  const juzErr = juzMem.filter((r) => r.ss.errorTotal > 0);
  const surahErr = surahMem.filter((r) => r.ss.errorTotal > 0);
  const pageErr = pageRows.filter((r) => r.ss.errorTotal > 0);

  const juzErrMax = Math.max(0, ...juzMem.map((r) => r.ss.errorTotal));
  const surahErrMax = Math.max(0, ...surahMem.map((r) => r.ss.errorTotal));
  const pageErrMax = Math.max(0, ...pageRows.map((r) => r.ss.errorTotal));

  const totalErrors = surahMem.reduce((sum, r) => sum + r.ss.errorTotal, 0);
  const hasErrors = totalErrors > 0;

  const visibleSurahErr = showAllSurahs ? surahMem : surahErr;

  const freshnessAria = (juz: number, bucket: FreshnessBucket, count: number) =>
    t("strength.freshnessScope")
      .replace("{n}", num(juz))
      .replace("{status}", t(`strength.${bucket}`))
      .replace("{count}", num(count));

  const scopeAria = (name: string, errors: number, count: number) =>
    t("heatmap.scopeLabel")
      .replace("{name}", name)
      .replace("{errors}", num(errors))
      .replace("{count}", num(count));

  const pageAria = (page: number, errors: number, count: number) =>
    t("heatmap.pageShare")
      .replace("{n}", num(page))
      .replace("{x}", num(errors))
      .replace("{y}", num(count));

  return (
    <div className="space-y-8">
      <SectionHeading as="h2">{t("strength.healthTitle")}</SectionHeading>

      {/* FRESHNESS facet: a per-juz aging bar. Color is BUCKETED
          (lapis -> gold -> ochre), width is the aggregate freshness, and a scope
          that has never been recalled reads a faint full ochre with a red count. */}
      <section aria-labelledby="strength-freshness">
        <SectionHeading as="h3" className="mb-1">
          <span id="strength-freshness">{t("strength.freshnessTitle")}</span>
        </SectionHeading>
        <p className="mb-3 text-small text-text-muted">{t("strength.freshnessHelp")}</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {juzMem.map((row) => {
            const bucket = freshnessBucket(row.ss);
            const eff = effectiveFreshness(row.ss);
            const isRed = bucket === "overdue" || bucket === "unseen";
            const barPct =
              bucket === "unseen"
                ? 100
                : bucket === "overdue"
                  ? Math.max(8, Math.round(eff * 100))
                  : Math.round(eff * 100);
            return (
              <li
                key={row.juz}
                className="rounded-lg border border-border bg-bg-card p-2 dark:bg-bg-card-dark"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-small font-medium tabular-nums">{num(row.juz)}</span>
                  <span
                    className={cn(
                      "text-micro tabular-nums",
                      isRed ? "text-red-600 dark:text-red-400" : "text-text-muted",
                    )}
                  >
                    {num(row.ss.count)}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-bg-subtle dark:bg-bg-subtle-dark"
                  role="img"
                  aria-label={freshnessAria(row.juz, bucket, row.ss.count)}
                >
                  <div
                    className={cn("h-full rounded-full", freshnessBarClass(bucket))}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-hidden="true">
          {FRESHNESS_LEGEND.map(([bucket, barClass]) => (
            <li key={bucket} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-5 rounded-full", barClass)} />
              <span className="text-micro text-text-muted">{t(`strength.${bucket}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ERROR heatmap: the most-failed memorized scopes across juz,
          surah, AND page. Brighter ochre = more recall errors. Only scopes with
          errors show by default; the surah dimension can reveal every memorized
          surah. When nothing has been missed the calm note stands in. */}
      <section aria-labelledby="strength-errors">
        <SectionHeading as="h3" className="mb-1">
          <span id="strength-errors">{t("heatmap.errorTitle")}</span>
        </SectionHeading>
        <p className="mb-3 text-small text-text-muted">{t("heatmap.errorHelp")}</p>

        {!hasErrors ? (
          <p className="text-small text-text-muted">{t("heatmap.noErrors")}</p>
        ) : (
          <div className="space-y-6">
            {juzErr.length > 0 && (
              <div>
                <h4 className="mb-2 text-small font-medium">{t("heatmap.byJuz")}</h4>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {juzErr.map((row) => (
                    <li
                      key={row.juz}
                      className="rounded-lg border border-border bg-bg-card p-2 dark:bg-bg-card-dark"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-small font-medium tabular-nums">{num(row.juz)}</span>
                        <span className="text-micro text-text-muted tabular-nums">
                          {num(row.ss.errorTotal)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-full rounded-full",
                          errorBarClass(row.ss.errorTotal, juzErrMax),
                        )}
                        role="img"
                        aria-label={scopeAria(num(row.juz), row.ss.errorTotal, row.ss.count)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {visibleSurahErr.length > 0 && (
              <div>
                <h4 className="mb-2 text-small font-medium">{t("heatmap.bySurah")}</h4>
                <ul className="space-y-3">
                  {visibleSurahErr.map((row) => (
                    <li key={row.number}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-small text-text-muted tabular-nums">
                            {num(row.number)}.
                          </span>
                          {isAr ? (
                            <ArabicText
                              text={row.nameArabic}
                              size="sm"
                              className="truncate leading-tight"
                            />
                          ) : (
                            <span className="truncate text-small font-medium">{row.nameSimple}</span>
                          )}
                        </div>
                        <span className="shrink-0 text-small text-text-muted tabular-nums">
                          {num(row.ss.errorTotal)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "h-2 w-full rounded-full",
                          errorBarClass(row.ss.errorTotal, surahErrMax),
                        )}
                        role="img"
                        aria-label={scopeAria(
                          isAr ? row.nameArabic : row.nameSimple,
                          row.ss.errorTotal,
                          row.ss.count,
                        )}
                      />
                    </li>
                  ))}
                </ul>
                {!showAllSurahs && surahErr.length < surahMem.length && (
                  <button
                    type="button"
                    onClick={() => setShowAllSurahs(true)}
                    className="mt-4 min-h-[44px] text-small font-medium text-primary underline-offset-4 hover:underline dark:text-primary-light"
                  >
                    {t("heatmap.showAll")}
                  </button>
                )}
              </div>
            )}

            {pageErr.length > 0 && (
              <div>
                <h4 className="mb-2 text-small font-medium">{t("heatmap.byPage")}</h4>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {pageErr.map((row) => (
                    <li
                      key={row.page}
                      className="rounded-lg border border-border bg-bg-card p-2 dark:bg-bg-card-dark"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-small font-medium tabular-nums">{num(row.page)}</span>
                        <span className="text-micro text-text-muted tabular-nums">
                          {num(row.ss.errorTotal)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-full rounded-full",
                          errorBarClass(row.ss.errorTotal, pageErrMax),
                        )}
                        role="img"
                        aria-label={pageAria(row.page, row.ss.errorTotal, row.ss.count)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
