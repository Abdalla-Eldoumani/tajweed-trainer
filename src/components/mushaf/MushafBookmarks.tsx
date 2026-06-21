"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TajweedText } from "@/components/ui/TajweedText";
import { OrnamentalDivider } from "@/components/ui/Ornament";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useTags } from "@/hooks/useTags";
import { TagEditor } from "./TagEditor";
import { useTranslation } from "@/lib/i18n";
import { getVerseSnapshotByKey } from "@/lib/verse-snapshots";
import { getTajweedSurah } from "@/lib/quran-api";
import { pageForSurah } from "@/lib/navigation";
import { toArabicIndic, cn } from "@/lib/utils";
import type { SurahHeader } from "@/lib/types";

interface MushafBookmarksProps {
  surahs: SurahHeader[];
}

type FetchLoad =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; tajweedHtml: string }
  | { state: "error" };

// One bookmarked verse's text, resolved from the verified snapshot first
// (synchronously in render, so the offline case never flashes a loader) and
// otherwise from the cached getTajweedSurah fetch. Never raw, never generated:
// it renders only through TajweedText. Mirrors MemorizedReview's
// VerseUnderReview resolution so snapshot verses work fully offline and
// everything degrades to a plain message when unreachable.
function BookmarkedVerseText({ verseKey }: { verseKey: string }) {
  const { t } = useTranslation();
  const snapshot = useMemo(() => getVerseSnapshotByKey(verseKey), [verseKey]);
  const [fetched, setFetched] = useState<FetchLoad>({ state: "idle" });

  useEffect(() => {
    // Snapshot verses resolve synchronously below; no fetch needed. Keyed by
    // verseKey at the call site, so it remounts per verse and starts idle.
    if (snapshot) return;
    let alive = true;
    const [surah] = verseKey.split(":").map(Number);
    getTajweedSurah(surah)
      .then((verses) => {
        if (!alive) return;
        const hit = verses.find((v) => v.verseKey === verseKey);
        setFetched(
          hit?.tajweedHtml
            ? { state: "ready", tajweedHtml: hit.tajweedHtml }
            : { state: "error" },
        );
      })
      .catch(() => {
        if (alive) setFetched({ state: "error" });
      });
    return () => {
      alive = false;
    };
  }, [verseKey, snapshot]);

  const load: FetchLoad = snapshot
    ? { state: "ready", tajweedHtml: snapshot.tajweedHtml }
    : fetched;

  if (load.state === "error") {
    return <p className="text-sm text-text-muted">{t("reading.unavailable")}</p>;
  }
  if (load.state !== "ready") {
    return <TajweedText tajweedHtml="" loading className="block" />;
  }
  return <TajweedText tajweedHtml={load.tajweedHtml} size="lg" className="block" />;
}

// The full bookmarked-verses view: each saved verse with its surah name + ayah
// reference, the verse text via TajweedText, a link into the reader at the right
// page, and a remove control (toggleVerseBookmark through useBookmarks). All
// localStorage-derived rendering is gated behind the hook's `mounted` flag so
// SSR and CSR never mismatch.
export function MushafBookmarks({ surahs }: MushafBookmarksProps) {
  const { t, isAr } = useTranslation();
  const { list, toggle, mounted } = useBookmarks();
  const { getTags } = useTags();
  const [query, setQuery] = useState("");

  const surahByNumber = useMemo(
    () => new Map(surahs.map((s) => [s.number, s])),
    [surahs],
  );

  // Sort by mushaf order (surah, then ayah) so the list reads in reading order
  // rather than insertion order.
  const ordered = useMemo(() => {
    return [...list].sort((a, b) => {
      const [sa, aa] = a.split(":").map(Number);
      const [sb, ab] = b.split(":").map(Number);
      return sa - sb || aa - ab;
    });
  }, [list]);

  // A simple substring filter over the user's OWN entries (not the global
  // content index): an empty query matches everything; otherwise the lowercased
  // query must be a substring of any of the verse's tags, of either surah-name
  // form (so the filter works whatever the UI language), or of the "surah:ayah"
  // reference. Both names are searched so an English query finds an Arabic-UI
  // row and vice versa.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return ordered;
    return ordered.filter((vk) => {
      const [sv] = vk.split(":").map(Number);
      const meta = surahByNumber.get(sv);
      const haystack = [
        ...getTags(vk),
        meta?.nameSimple ?? "",
        meta?.nameArabic ?? "",
        vk,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [ordered, query, surahByNumber, getTags]);

  const header = (
    <div className="space-y-2">
      <Link
        href="/mushaf"
        className="inline-flex items-center gap-1 text-sm text-primary dark:text-primary-light hover:underline underline-offset-2"
      >
        <span aria-hidden="true">{isAr ? "→" : "←"}</span>
        {t("mushaf.bookmarksBack")}
      </Link>
      <div>
        <h1 className="font-heading text-h2 font-bold">{t("mushaf.bookmarksTitle")}</h1>
        <p className="text-sm text-text-muted mt-1">{t("mushaf.bookmarksSubtitle")}</p>
      </div>
    </div>
  );

  // Pre-mount: render the header only (no list), matching the server snapshot
  // where bookmarks are empty. Avoids a hydration mismatch and an empty-state
  // flash before the client read lands.
  if (!mounted) {
    return <div className="space-y-6">{header}</div>;
  }

  if (ordered.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="text-center space-y-4 py-10">
          <p className="text-sm text-text-muted">{t("mushaf.bookmarksEmpty")}</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">{t("mushaf.bookmarksEmptyHint")}</p>
          <OrnamentalDivider className="max-w-xs mx-auto" />
          <Link
            href="/mushaf"
            className="inline-flex items-center rounded-lg bg-primary text-on-primary px-4 py-2 min-h-[44px] text-sm font-medium hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep"
          >
            {t("mushaf.bookmarksOpenReader")}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <p className="text-xs text-text-muted">
        {t("mushaf.bookmarksCount").replace("{count}", isAr ? toArabicIndic(ordered.length) : String(ordered.length))}
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        dir="auto"
        placeholder={t("bookmarks.filterPlaceholder")}
        aria-label={t("bookmarks.filterLabel")}
        className="w-full rounded-lg border border-gold-light/40 dark:border-gold-dark/30 bg-bg-card dark:bg-bg-card-dark px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />

      {filtered.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-sm text-text-muted">{t("bookmarks.filterEmpty")}</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((vk) => {
            const [sv, av] = vk.split(":").map(Number);
            const meta = surahByNumber.get(sv);
            const surahName = meta ? (isAr ? meta.nameArabic : meta.nameSimple) : "";
            const refLabel = isAr ? `${toArabicIndic(sv)}:${toArabicIndic(av)}` : `${sv}:${av}`;
            return (
              <li key={vk}>
                <Card className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-heading font-semibold">
                      {surahName} <span className="font-mono text-xs text-text-muted">{refLabel}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(vk)}
                      aria-label={t("mushaf.bookmarkVerseRemove")}
                      title={t("mushaf.bookmarkVerseRemove")}
                      className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:text-accent hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
                      </svg>
                    </button>
                  </div>

                  <div
                    className={cn(
                      "rounded-xl border border-gold-light/30 bg-bg-subtle/30 p-4",
                      "dark:border-gold-dark/20 dark:bg-bg-subtle-dark/30",
                    )}
                  >
                    <BookmarkedVerseText verseKey={vk} />
                  </div>

                  <TagEditor verseKey={vk} />

                  <Link
                    href={`/mushaf/page/${pageForSurah(sv)}?v=${vk}`}
                    className="inline-flex items-center gap-1 text-sm text-primary dark:text-primary-light hover:underline underline-offset-2"
                  >
                    {t("mushaf.bookmarkOpenVerse")}
                    <span aria-hidden="true">{isAr ? "←" : "→"}</span>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
