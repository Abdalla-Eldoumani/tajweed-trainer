"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic, cn } from "@/lib/utils";
import { MushafPage } from "./MushafPage";
import type { MushafPageData, SurahHeader } from "@/lib/types";

interface MushafReaderProps {
  page: number;
  data: MushafPageData;
  surahs: SurahHeader[];
}

const TOTAL_PAGES = 604;

const ChevronStart = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronEnd = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export function MushafReader({ page, data, surahs }: MushafReaderProps) {
  const { settings, updateSettings } = useSettings();
  const { t, isAr } = useTranslation();
  const router = useRouter();
  // localStorage isn't available on the server, so any UI driven by it
  // (bookmark fill, last-page label) waits for client hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Persist last viewed page on mount and whenever the page changes.
  useEffect(() => {
    updateSettings({ lastMushafPage: page });
  }, [page, updateSettings]);

  // RTL keyboard navigation: in Arabic mode the right arrow advances, left goes back.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") {
        const next = isAr ? Math.max(1, page - 1) : Math.min(TOTAL_PAGES, page + 1);
        router.push(`/mushaf/page/${next}`);
      } else if (e.key === "ArrowLeft") {
        const next = isAr ? Math.min(TOTAL_PAGES, page + 1) : Math.max(1, page - 1);
        router.push(`/mushaf/page/${next}`);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, isAr, router]);

  const bookmarks = useMemo(() => settings.mushafBookmarks ?? [], [settings.mushafBookmarks]);
  // Hydration safety: server can't know which pages are bookmarked, so the
  // filled state stays false until after mount.
  const isBookmarked = mounted && bookmarks.includes(page);

  const toggleBookmark = () => {
    const next = isBookmarked ? bookmarks.filter((p) => p !== page) : [...bookmarks, page].sort((a, b) => a - b);
    updateSettings({ mushafBookmarks: next });
  };

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(TOTAL_PAGES, page + 1);
  const atStart = page === 1;
  const atEnd = page === TOTAL_PAGES;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2">
          <Link href={`/mushaf/page/${prevPage}`} aria-disabled={atStart} className={cn(atStart && "pointer-events-none opacity-40")}>
            <Button variant="outline" size="sm" className="gap-1 min-h-[44px]" aria-label={t("mushaf.previousPage")}>
              <ChevronStart />
              <span className="hidden sm:inline">{t("mushaf.previousPage")}</span>
            </Button>
          </Link>
          <Link href={`/mushaf/page/${nextPage}`} aria-disabled={atEnd} className={cn(atEnd && "pointer-events-none opacity-40")}>
            <Button variant="outline" size="sm" className="gap-1 min-h-[44px]" aria-label={t("mushaf.nextPage")}>
              <span className="hidden sm:inline">{t("mushaf.nextPage")}</span>
              <ChevronEnd />
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Treat the dropdown as a "jump to" picker. A page can show 0, 1, 2,
              or 3 surah starts, so there is no single right answer for "selected
              option". Binding value to the page number used to make the label
              lie when the page coincidentally matched a surah number (e.g.
              page 106 displaying "106. Quraysh" while showing Al-Ma'idah). */}
          <select
            value=""
            onChange={(e) => router.push(`/mushaf/surah/${e.target.value}`)}
            className="text-xs bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]"
            aria-label={t("mushaf.surahIndex")}
          >
            <option value="">{t("mushaf.surahIndex")}</option>
            {surahs.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {isAr ? s.nameArabic : s.nameSimple}
              </option>
            ))}
          </select>

          <button
            onClick={toggleBookmark}
            className={cn(
              "inline-flex items-center justify-center w-11 h-11 rounded-lg border transition-colors",
              isBookmarked
                ? "bg-gold/20 text-gold-dark dark:text-gold-light border-gold-dark/40"
                : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-gold-light/15"
            )}
            aria-label={isBookmarked ? t("mushaf.bookmarkRemove") : t("mushaf.bookmarkAdd")}
            aria-pressed={isBookmarked}
          >
            <BookmarkIcon filled={isBookmarked} />
          </button>
        </div>
      </div>

      <MushafPage data={data} />

      {/* Footer page indicator */}
      <p className="text-center text-xs text-text-muted">
        {t("mushaf.pageNumber")} {isAr ? toArabicIndic(page) : page} / {isAr ? toArabicIndic(TOTAL_PAGES) : TOTAL_PAGES}
      </p>
    </div>
  );
}
