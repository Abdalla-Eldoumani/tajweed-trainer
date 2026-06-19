"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { useTranslation } from "@/lib/i18n";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { SearchResult } from "@/lib/search";
import { searchVerses, type VerseSearchResult } from "@/lib/quran-api";
import { pageForSurah } from "@/lib/navigation";
import { getProgress } from "@/lib/storage";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<SearchResult["kind"], { en: string; ar: string }> = {
  surah: { en: "Surah", ar: "سورة" },
  module: { en: "Module", ar: "وحدة" },
  rule: { en: "Rule", ar: "حكم" },
  letter: { en: "Letter", ar: "حرف" },
  "waqf-symbol": { en: "Waqf symbol", ar: "رمز وقف" },
};

// The verse results are Quran ayat, a category outside the local SearchResult
// kinds; "verses" is a synthetic filter value so one chip row governs both
// sections. "all" clears the filter.
type Filter = "all" | "verses" | SearchResult["kind"];

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");

export default function SearchPage() {
  const { t, isAr } = useTranslation();
  const [query, setQuery] = useState("");
  // Single-select kind filter. Single (not multi) keeps the control calm: the
  // kind set is tiny and "all" plus one active chip reads clearly. Filtering is
  // client-side over the already-computed results; no extra fetch.
  const [filter, setFilter] = useState<Filter>("all");
  // Independent facet: narrow the verse results to memorized verses only. Gated
  // on the bookmarks hook's mount flag via `memorizedVerses` below.
  const [memorizedOnly, setMemorizedOnly] = useState(false);

  // The local search corpus imports every content file (~100 KB). Load it
  // dynamically after mount so it stays off the route's initial JS; it resolves
  // in a few ms, long before anyone types the two-character minimum, so local
  // results behave exactly as before.
  const [searchFn, setSearchFn] = useState<((q: string, n: number) => SearchResult[]) | null>(null);
  useEffect(() => {
    let alive = true;
    import("@/lib/search").then((m) => {
      if (alive) setSearchFn(() => m.search);
    });
    return () => {
      alive = false;
    };
  }, []);
  const results = useMemo(() => (searchFn ? searchFn(query, 30) : []), [searchFn, query]);

  // Memorized verseKeys, read once after mount (localStorage is client-only, so
  // this stays empty on the server and never mismatches hydration). The mount
  // flag gates the memorized facet so it never flashes during hydration.
  const [mounted, setMounted] = useState(false);
  const [memorizedVerses, setMemorizedVerses] = useState<Set<string>>(new Set());
  useEffect(() => {
    setMemorizedVerses(new Set(getProgress().memorizedVerses));
    setMounted(true);
  }, []);

  // Quran verse-text search runs against the API, debounced. The local index
  // above is the offline fallback; verse search just adds verses when reachable.
  const debounced = useDebouncedValue(query, 350);
  const [verses, setVerses] = useState<VerseSearchResult[]>([]);
  const [verseState, setVerseState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  // Bumped by the retry button to re-run the verse fetch for the same query.
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) {
      setVerses([]);
      setVerseState("idle");
      return;
    }
    let alive = true;
    setVerseState("loading");
    searchVerses(q)
      .then((r) => {
        if (!alive) return;
        setVerses(r);
        setVerseState("ready");
      })
      .catch(() => {
        if (alive) setVerseState("error");
      });
    return () => {
      alive = false;
    };
  }, [debounced, retryTick]);

  const short = query.trim().length < 2;

  // Kinds present in the current local result set, in a stable display order, so
  // chips only appear for categories that actually have hits.
  const presentKinds = useMemo(() => {
    const order: SearchResult["kind"][] = ["surah", "module", "rule", "letter", "waqf-symbol"];
    const seen = new Set(results.map((r) => r.kind));
    return order.filter((k) => seen.has(k));
  }, [results]);

  // The memorized facet only makes sense when there are memorized verses to
  // intersect and verse results to narrow; otherwise the chip is hidden.
  const showMemorizedFacet = mounted && memorizedVerses.size > 0 && verses.length > 0;

  // Apply the single-select kind filter to the local results.
  const filteredResults = useMemo(() => {
    if (filter === "all") return results;
    if (filter === "verses") return [];
    return results.filter((r) => r.kind === filter);
  }, [results, filter]);

  // Verses show when the filter allows them ("all" or "verses"); the memorized
  // facet further narrows to memorized verseKeys.
  const versesAllowed = filter === "all" || filter === "verses";
  const filteredVerses = useMemo(() => {
    if (!versesAllowed) return [];
    if (memorizedOnly) return verses.filter((v) => memorizedVerses.has(v.verseKey));
    return verses;
  }, [verses, versesAllowed, memorizedOnly, memorizedVerses]);

  // Verse-section chrome (loading / error / list) shows only when verses are
  // allowed by the current filter.
  const showVerseSection =
    versesAllowed && (verseState === "loading" || verseState === "error" || filteredVerses.length > 0);

  const chipClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 min-h-[36px] text-xs rounded-full font-medium transition-colors border",
      active
        ? "bg-primary text-on-primary border-transparent dark:bg-gold dark:text-ink"
        : "bg-bg-card text-text-muted border-border hover:text-text dark:bg-bg-card-dark",
    );

  // Any chip beyond the always-present "All", only render the filter row when
  // there is something to filter.
  const hasFilters = !short && (presentKinds.length > 0 || verses.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-h2 font-bold">{t("search.title")}</h1>
        <p className="text-sm text-text-muted mt-2">{t("search.subtitle")}</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.title")}
        autoFocus
        className="w-full px-4 py-3 min-h-[48px] rounded-lg border border-gold-light/40 dark:border-gold-dark/30 bg-bg-card dark:bg-bg-card-dark text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
      />

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("search.filterLabel")}>
          <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={chipClass(filter === "all")}>
            {t("search.filterAll")}
          </button>
          {verses.length > 0 && (
            <button type="button" onClick={() => setFilter("verses")} aria-pressed={filter === "verses"} className={chipClass(filter === "verses")}>
              {t("search.verses")}
            </button>
          )}
          {presentKinds.map((k) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={chipClass(filter === k)}>
              {isAr ? KIND_LABEL[k].ar : KIND_LABEL[k].en}
            </button>
          ))}
          {showMemorizedFacet && (
            <button
              type="button"
              onClick={() => setMemorizedOnly((v) => !v)}
              aria-pressed={memorizedOnly}
              className={cn(chipClass(memorizedOnly), "ms-auto")}
            >
              {t("search.filterMemorized")}
            </button>
          )}
        </div>
      )}

      {short ? (
        <p className="text-sm text-text-muted">{t("search.hint")}</p>
      ) : (
        <div className="space-y-6">
          {/* Quran verses (API) */}
          {showVerseSection && (
            <div>
              <h2 className="text-sm font-semibold mb-2">{t("search.verses")}</h2>
              {verseState === "error" ? (
                <div className="space-y-2">
                  <p className="text-sm text-text-muted">{t("search.verseError")}</p>
                  <button
                    type="button"
                    onClick={() => setRetryTick((n) => n + 1)}
                    className="text-sm text-primary dark:text-primary-light hover:underline underline-offset-2"
                  >
                    {t("search.retry")}
                  </button>
                </div>
              ) : verseState === "loading" && filteredVerses.length === 0 ? (
                <p className="text-sm text-text-muted">{t("common.loading")}</p>
              ) : (
                <ul className="space-y-2" aria-live="polite">
                  {filteredVerses.map((v) => {
                    const [sv] = v.verseKey.split(":").map(Number);
                    return (
                      <li key={v.verseKey}>
                        <Link href={`/mushaf/page/${pageForSurah(sv)}?v=${v.verseKey}`} className="block">
                          <Card hover className="space-y-1">
                            <span className="text-xs font-mono text-primary dark:text-primary-light">{v.verseKey}</span>
                            {v.text && <p className="text-sm text-text-muted line-clamp-2" dir="auto">{stripTags(v.text)}</p>}
                          </Card>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Modules, rules, surah names (local index) */}
          {filteredResults.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2">{t("search.inApp")}</h2>
              <ul className="space-y-2" aria-live="polite">
                {filteredResults.map((r) => (
                  <li key={r.id}>
                    <Link href={r.href} className="block">
                      <Card hover className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold">{isAr ? r.title.ar : r.title.en}</h3>
                            {!isAr && r.kind === "surah" && (
                              <ArabicText text={r.title.ar.replace(/^\d+\.\s*/, "")} size="sm" className="text-text-muted" />
                            )}
                          </div>
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light shrink-0">
                            {isAr ? KIND_LABEL[r.kind].ar : KIND_LABEL[r.kind].en}
                          </span>
                        </div>
                        {r.subtitle && (r.subtitle.en || r.subtitle.ar) && (
                          <p className="text-xs text-text-muted line-clamp-2">
                            {isAr && r.subtitle.ar ? r.subtitle.ar : r.subtitle.en}
                          </p>
                        )}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nothing to show. Distinguish a genuinely empty search from a filter
              that hid every otherwise-present result. */}
          {filteredResults.length === 0 && filteredVerses.length === 0 && verseState !== "loading" && verseState !== "error" && (
            <p className="text-sm text-text-muted">
              {filter === "all" && !memorizedOnly ? t("search.noResults") : t("search.filterEmpty")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
