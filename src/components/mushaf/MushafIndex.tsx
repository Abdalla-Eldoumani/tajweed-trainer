"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { OrnamentalDivider } from "@/components/ui/Ornament";
import { YounesNarrationPanel } from "@/components/mushaf/YounesNarrationPanel";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getProgress } from "@/lib/storage";
import { pageForSurah } from "@/lib/navigation";
import { toArabicIndic, cn } from "@/lib/utils";
import type { SurahHeader, VerseLocation } from "@/lib/types";

interface MushafIndexProps {
  surahs: SurahHeader[];
}

type FilterPlace = "all" | "makkah" | "madinah";

// How many verse bookmarks the index previews inline before deferring to the
// full /mushaf/bookmarks view. Keeps the index strip short.
const VERSE_BOOKMARK_PREVIEW = 8;

export function MushafIndex({ surahs }: MushafIndexProps) {
  const { settings } = useSettings();
  const { t, isAr } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterPlace>("all");

  const lastPage = settings.lastMushafPage ?? 0;
  const bookmarks = settings.mushafBookmarks ?? [];
  const { list: verseBookmarks, mounted: bmMounted } = useBookmarks();

  // Preview the bookmarks in mushaf order (surah, then ayah) so the strip and
  // the full view agree on which verses come first.
  const orderedVerseBookmarks = useMemo(
    () =>
      [...verseBookmarks].sort((a, b) => {
        const [sa, aa] = a.split(":").map(Number);
        const [sb, ab] = b.split(":").map(Number);
        return sa - sb || aa - ab;
      }),
    [verseBookmarks],
  );

  // Per-surah saved positions, read once after mount (localStorage is
  // client-only, so this stays empty on the server and never mismatches
  // hydration). A surah shows a resume affordance only when its saved page is
  // deeper than the surah's own first page; that filter happens at render.
  const [resumeBySurah, setResumeBySurah] = useState<Record<number, VerseLocation>>({});
  useEffect(() => setResumeBySurah(getProgress().lastReadBySurah ?? {}), []);

  const filteredSurahs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return surahs.filter((s) => {
      if (filter !== "all" && s.revelationPlace !== filter) return false;
      if (!q) return true;
      return (
        s.nameSimple.toLowerCase().includes(q) ||
        s.nameArabic.includes(search.trim()) ||
        String(s.number) === q
      );
    });
  }, [surahs, search, filter]);

  return (
    <div className="space-y-6">
      <div className="text-center py-6 islamic-pattern-bg rounded-xl relative overflow-hidden">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold relative z-10">{t("mushaf.title")}</h1>
        <ArabicText text="المصحف الشريف" quran size="md" className="text-gold-dark dark:text-gold-light mt-2 block relative z-10" />
        <p className="text-sm text-text-muted mt-3 max-w-md mx-auto relative z-10">{t("mushaf.subtitle")}</p>
        <OrnamentalDivider className="max-w-xs mx-auto mt-4 relative z-10" />
      </div>

      {lastPage > 1 && (
        <Card className="card-elevated">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-text-muted">{t("mushaf.continueReading").replace("{page}", isAr ? toArabicIndic(lastPage) : String(lastPage))}</p>
            </div>
            <Link
              href={`/mushaf/page/${lastPage}`}
              className="px-4 py-2 min-h-[44px] inline-flex items-center rounded-lg bg-primary text-on-primary text-sm font-medium hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep"
            >
              {t("mushaf.openReader")}
            </Link>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("mushaf.searchSurah")}
          className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 text-sm"
          aria-label={t("mushaf.searchSurah")}
        />
        <div className="flex gap-1 rounded-lg bg-bg-subtle dark:bg-bg-subtle-dark p-1">
          {(["all", "makkah", "madinah"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-3 py-2 text-xs rounded min-h-[36px] font-medium transition-colors",
                filter === k ? "bg-bg-card dark:bg-bg-card-dark text-primary dark:text-primary-light shadow-sm" : "text-text-muted hover:text-text"
              )}
              aria-pressed={filter === k}
            >
              {k === "all" ? t("mushaf.allSurahs") : k === "makkah" ? t("mushaf.makkahSurahs") : t("mushaf.madinahSurahs")}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmarks row */}
      {bookmarks.length > 0 && (
        <div>
          <h2 className="font-heading text-sm font-semibold mb-2">{t("mushaf.bookmarks")}</h2>
          <div className="flex flex-wrap gap-2">
            {bookmarks.map((p) => (
              <Link
                key={p}
                href={`/mushaf/page/${p}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold/15 text-gold-dark dark:text-gold-light text-xs font-medium hover:bg-gold/25"
              >
                {t("mushaf.pageNumber")} {isAr ? toArabicIndic(p) : p}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Verse bookmarks: a compact quick-access strip (capped) with a link to
          the full bookmarked-verses view, which shows each verse's text and a
          remove control. Keeps the index calm; the list lives on its own page. */}
      {bmMounted && verseBookmarks.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="font-heading text-sm font-semibold">{t("mushaf.verseBookmarks")}</h2>
            <Link
              href="/mushaf/bookmarks"
              className="text-xs font-medium text-primary dark:text-primary-light hover:underline underline-offset-2"
            >
              {t("mushaf.bookmarksViewAll")}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {orderedVerseBookmarks.slice(0, VERSE_BOOKMARK_PREVIEW).map((vk) => {
              const [sv, av] = vk.split(":").map(Number);
              const meta = surahs.find((s) => s.number === sv);
              const label = meta
                ? `${isAr ? meta.nameArabic : meta.nameSimple} ${isAr ? toArabicIndic(av) : av}`
                : vk;
              return (
                <Link
                  key={vk}
                  href={`/mushaf/page/${pageForSurah(sv)}?v=${vk}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light text-xs font-medium hover:bg-primary/20"
                >
                  {label}
                </Link>
              );
            })}
            {verseBookmarks.length > VERSE_BOOKMARK_PREVIEW && (
              <Link
                href="/mushaf/bookmarks"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-subtle dark:bg-bg-subtle-dark text-text-muted text-xs font-medium hover:text-text"
              >
                +{isAr ? toArabicIndic(verseBookmarks.length - VERSE_BOOKMARK_PREVIEW) : verseBookmarks.length - VERSE_BOOKMARK_PREVIEW}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* A different narration (Warsh, per-surah): a fully walled-off, disclaimer
          gated entry with its own isolated <audio>. It never enters the Hafs
          reciter list, the per-verse reader, or the shared player. Placed here as
          a calm, clearly-separated section, never among the Hafs surah list. */}
      <YounesNarrationPanel surahs={surahs} />

      {/* Surah grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSurahs.map((s) => {
          // Show a resume affordance only when this surah has a saved position
          // past its own first page (otherwise "resume" would just be "open").
          const resume = resumeBySurah[s.number];
          const canResume = !!resume && resume.page > s.pages[0];
          const surahName = isAr ? s.nameArabic : s.nameSimple;
          return (
            <Card key={s.number} className="h-full flex flex-col">
              <Link href={`/mushaf/surah/${s.number}`} className="block group">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gold-light/20 dark:bg-gold-dark/20 border border-gold-light/40 dark:border-gold-dark/30 flex items-center justify-center text-gold-dark dark:text-gold-light text-sm font-bold font-arabic shrink-0">
                    {isAr ? toArabicIndic(s.number) : s.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <ArabicText text={s.nameArabic} quran size="sm" className="block text-primary dark:text-primary-light" />
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                          s.revelationPlace === "madinah"
                            ? "bg-gold/20 text-gold-dark dark:text-gold-light"
                            : "bg-primary/10 text-primary dark:text-primary-light"
                        )}
                      >
                        {t(`mushaf.revealedIn.${s.revelationPlace}`)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5 truncate group-hover:text-primary dark:group-hover:text-primary-light transition-colors">{s.nameSimple}</p>
                    <p className="text-[11px] text-text-muted mt-1">
                      {t("mushaf.versesCount").replace("{count}", isAr ? toArabicIndic(s.versesCount) : String(s.versesCount))}
                      <span className="mx-1.5 opacity-60">·</span>
                      {t("mushaf.pageNumber")} {isAr ? toArabicIndic(s.pages[0]) : s.pages[0]}
                    </p>
                  </div>
                </div>
              </Link>
              {canResume && (
                <Link
                  href={`/mushaf/page/${resume.page}?v=${resume.verseKey}`}
                  className="mt-3 ms-14 inline-flex items-center gap-1 self-start rounded-lg bg-primary/10 dark:bg-primary-light/15 text-primary dark:text-primary-light text-[11px] font-medium px-2.5 py-1 hover:bg-primary/20 transition-colors"
                  aria-label={t("mushaf.resumeSurahHint")
                    .replace("{name}", surahName)
                    .replace("{page}", isAr ? toArabicIndic(resume.page) : String(resume.page))}
                  title={t("mushaf.resumeSurahHint")
                    .replace("{name}", surahName)
                    .replace("{page}", isAr ? toArabicIndic(resume.page) : String(resume.page))}
                >
                  <span aria-hidden="true">{isAr ? "←" : "→"}</span>
                  {t("mushaf.resumeSurah")}
                  <span className="opacity-70">{isAr ? toArabicIndic(resume.page) : resume.page}</span>
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
