"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { usePlayer } from "@/hooks/usePlayer";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useMemorization } from "@/hooks/useMemorization";
import { pageForJuz, pageForSurah, surahForPage, TOTAL_JUZ } from "@/lib/navigation";
import { clampJuz } from "@/lib/validate";
import { setLastRead } from "@/lib/storage";
import { toArabicIndic, cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { MushafPage } from "./MushafPage";
import { PlaybackSurface } from "./PlaybackSurface";
import { ReaderPalette } from "./ReaderPalette";
import { VerseSelectionProvider, useVerseSelectionState } from "./useVerseSelection";
import { ReadingDepth } from "@/components/learn/ReadingDepth";
import { WordByWord } from "@/components/learn/WordByWord";
import { RecitationCompare } from "@/components/mushaf/RecitationCompare";
import type { MushafPageData, SurahHeader } from "@/lib/types";
import { getColorForClass } from "@/lib/tajweed-colors";

interface MushafReaderProps {
  page: number;
  data: MushafPageData;
  surahs: SurahHeader[];
}

const TOTAL_PAGES = 604;

// Rules a learner can isolate with the highlight drill. Names are read from the
// tajweed map; the CSS in globals.css greys everything except the chosen rule.
const DRILL_CLASSES = [
  "ghunnah",
  "idgham_ghunnah",
  "idgham_wo_ghunnah",
  "idgham_shafawi",
  "ikhafa",
  "ikhafa_shafawi",
  "iqlab",
  "qalaqah",
  "madda_normal",
  "madda_necessary",
] as const;

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

const EyeIcon = ({ closed }: { closed: boolean }) => (
  closed ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
);

const PlaySolid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PlayFromHereIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 5v14l8-7zM13 5v14l8-7z" />
  </svg>
);

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export function MushafReader({ page, data, surahs }: MushafReaderProps) {
  const { settings, updateSettings } = useSettings();
  const { t, isAr } = useTranslation();
  const router = useRouter();
  const { isBookmarked: isVerseBookmarked, toggle: toggleVerseBm, mounted: bmMounted } = useBookmarks();
  const { isMemorized, toggle: toggleMemorized, count: memorizedCount, mounted: memMounted } = useMemorization();
  // The reading-depth panel renders below the page; scroll it into view when a
  // verse is tapped so the translation/tafsir is never opened off-screen.
  const panelRef = useRef<HTMLDivElement>(null);
  // localStorage isn't available on the server, so any UI driven by it
  // (bookmark fill, last-page label) waits for client hydration.
  const [mounted, setMounted] = useState(false);
  // Memorization mode hides verse text the user has marked memorized so they
  // can recall it. Off by default; in-session state, not persisted.
  const [memorizationMode, setMemorizationMode] = useState(false);
  // The Cmd/Ctrl+K quick-jump palette. In-session, not persisted.
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Single-rule highlight drill: greys every tajweed rule except the chosen one.
  const [drill, setDrill] = useState("");
  // A lesson "open in reader" link arrives as ?v=surah:ayah; we scroll that verse
  // into view and start it (single mode). Read client-side so the statically
  // generated page needs no Suspense boundary for useSearchParams.
  const [targetVerseKey, setTargetVerseKey] = useState<string | null>(null);
  // The verse whose reading-depth panel (translation, tafsir, word-by-word) is open.
  const [selectedVerse, setSelectedVerse] = useState<string | null>(null);
  // Multi-verse selection (a hand-picked set or a contiguous range), lifted here
  // so the page's per-verse add controls + markers and the playback surface's
  // chips + transport share one source. In-memory only, reader-scoped: it lives
  // as long as the user stays within one rendered reader view and is not
  // persisted to storage (UI-SPEC B8; reload persistence, if ever wanted, would
  // go through the consolidated storage.ts sanitizer, never an ad-hoc key). This
  // matches the established reader-local-state precedent (the collapsed-rail
  // flag from plan 03): the zustand player store carries playback across pages,
  // while reader-local React state resets on a route change.
  const selection = useVerseSelectionState();
  useEffect(() => setMounted(true), []);

  // B4 (loop on, navigate away): the whole-selection loop is a store flag that
  // outlives this reader. When the reader unmounts (the user leaves the page),
  // turn the loop off so a selection does not keep looping forever in the
  // background once the user has moved on. This does not stop in-progress
  // playback (the global player design keeps audio alive across routes); it only
  // ends the perpetual loop so the current pass finishes naturally.
  useEffect(() => {
    return () => {
      if (usePlayer.getState().loopSelection) usePlayer.getState().setLoopSelection(false);
    };
  }, []);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    if (!v || !/^\d{1,3}:\d{1,3}$/.test(v)) return;
    setTargetVerseKey(v);
    const [s, a] = v.split(":").map(Number);
    const header = surahs.find((h) => h.number === s);
    usePlayer.getState().playVerse(s, a, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: header ? (isAr ? header.nameArabic : header.nameSimple) : null,
    });
    // Mount-only: the target is taken from the entry URL once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist last viewed page on mount and whenever the page changes. lastRead is
  // the consolidated-model location the home resume card reads; lastMushafPage is
  // kept for the mushaf index's own resume affordance.
  useEffect(() => {
    updateSettings({ lastMushafPage: page });
    const first = data.verses[0];
    if (first) setLastRead(`${first.surah}:${first.ayah}`, page);
  }, [page, data, updateSettings]);

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

  // Cmd/Ctrl+K opens the quick-jump palette from anywhere in the reader. The
  // browser's own shortcut is prevented; modifier-gated so it never fires while
  // the user is simply typing. Guarded against re-firing while already open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((isOpen) => (isOpen ? isOpen : true));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bring the reading-depth panel into view when a verse is selected (it renders
  // below the page, so a tap near the top of a long page would otherwise be silent).
  useEffect(() => {
    if (selectedVerse) panelRef.current?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selectedVerse]);

  // Escape closes the open reading-depth panel, like any dismissible overlay.
  useEffect(() => {
    if (!selectedVerse) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedVerse(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedVerse]);

  const bookmarks = useMemo(() => settings.mushafBookmarks ?? [], [settings.mushafBookmarks]);
  // Hydration safety: server can't know which pages are bookmarked, so the
  // filled state stays false until after mount.
  const isBookmarked = mounted && bookmarks.includes(page);

  const toggleBookmark = () => {
    const next = isBookmarked ? bookmarks.filter((p) => p !== page) : [...bookmarks, page].sort((a, b) => a - b);
    updateSettings({ mushafBookmarks: next });
  };

  // Play the whole surah continuously, auto-advancing ayah to ayah, from its
  // first verse. The mini-player then lets the user pause/resume anywhere.
  const playFullSurah = () => {
    const first = data.verses[0];
    if (!first) return;
    const header = surahs.find((s) => s.number === first.surah);
    usePlayer.getState().playSurah(first.surah, 1, header?.versesCount ?? first.ayah, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: header ? (isAr ? header.nameArabic : header.nameSimple) : null,
    });
  };

  // Play a single verse (single mode). Used by both the plain verse tap on the
  // page and the reading-depth panel's play control, so a tap and the panel
  // share one code path and the loading state appears within 100ms (playVerse
  // sets status "loading" synchronously).
  const playSingleVerse = (sv: number, av: number) => {
    const header = surahs.find((s) => s.number === sv);
    usePlayer.getState().playVerse(sv, av, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: header ? (isAr ? header.nameArabic : header.nameSimple) : null,
    });
  };

  // A plain tap on a verse plays it (single mode) and surfaces the playback
  // panel. The reading-depth panel is reached from the per-verse details
  // control instead, so the tap is never ambiguous and never double-plays.
  const handlePlayVerse = (verseKey: string) => {
    if (!/^\d{1,3}:\d{1,3}$/.test(verseKey)) return;
    const [sv, av] = verseKey.split(":").map(Number);
    playSingleVerse(sv, av);
  };

  // Play continuously from this verse to the end of its surah.
  const playFromVerse = (sv: number, av: number) => {
    const header = surahs.find((s) => s.number === sv);
    if (!header) return;
    usePlayer.getState().playSurah(sv, av, header.versesCount, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: isAr ? header.nameArabic : header.nameSimple,
    });
  };

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(TOTAL_PAGES, page + 1);
  const atStart = page === 1;
  const atEnd = page === TOTAL_PAGES;

  // The surah selector is a readout of the current page, not a jump-to picker:
  // its value is a surah genuinely on the page. A page lists its surahs in
  // data.surahsOnPage; use the first. The fallback chain only fires if that is
  // ever empty and still resolves to a real surah for the page, never an
  // invented one (UI-SPEC A1). This is the single place the fallback lives.
  const currentSurahValue =
    data.surahsOnPage[0]?.number ?? surahForPage(page)?.number ?? data.verses[0]?.surah ?? 1;
  // Clamp the juz to 1..30 so the controlled select never holds a value with no
  // matching option (the API juz_number can fall back to 0 in quran-api.ts).
  const currentJuzValue = clampJuz(data.juzNumber);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playFullSurah}
            aria-label={t("mushaf.playSurah")}
            title={t("mushaf.playSurah")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-on-primary px-3 py-2 min-h-[44px] text-small font-medium hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep transition-colors"
          >
            <PlaySolid />
            <span className="hidden sm:inline">{t("mushaf.playSurah")}</span>
          </button>
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
          {/* Surah and juz selectors are controlled readouts of the open page:
              the surah is one genuinely on the page (currentSurahValue), the juz
              is the page's juz. Both come from server props, so a deep-linked
              reload paints the right values on the first frame with no mounted
              gating. Re-selecting the current value is a guarded no-op; a real
              choice routes through the single /mushaf/page funnel. */}
          <select
            value={currentSurahValue}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n === currentSurahValue) return;
              router.push(`/mushaf/page/${pageForSurah(n)}`);
            }}
            className="text-micro bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]"
            aria-label={t("mushaf.surahIndex")}
          >
            {surahs.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {isAr ? s.nameArabic : s.nameSimple}
              </option>
            ))}
          </select>

          <select
            value={currentJuzValue}
            onChange={(e) => {
              const j = Number(e.target.value);
              if (j === currentJuzValue) return;
              router.push(`/mushaf/page/${pageForJuz(j)}`);
            }}
            className="text-micro bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]"
            aria-label={t("mushaf.juzIndex")}
          >
            {Array.from({ length: TOTAL_JUZ }, (_, i) => i + 1).map((j) => (
              <option key={j} value={j}>
                {t("mushaf.juz")} {isAr ? toArabicIndic(j) : j}
              </option>
            ))}
          </select>

          <select
            value={drill}
            onChange={(e) => setDrill(e.target.value)}
            className="text-micro bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]"
            aria-label={t("mushaf.drill")}
            title={t("mushaf.drill")}
          >
            <option value="">{t("mushaf.drillOff")}</option>
            {DRILL_CLASSES.map((c) => {
              const info = getColorForClass(c);
              return (
                <option key={c} value={c}>
                  {info ? (isAr ? info.nameAr : info.nameEn) : c}
                </option>
              );
            })}
          </select>

          {/* Recall control: the visible "Recall" label (>=sm) plus the eye icon
              mirror the "Play surah" / "Jump to…" label-beside-icon pattern, so a
              first-time user sees what the eye does. The title carries the purpose
              ("hides memorized verses to test recall") while the aria-label keeps
              flipping on/off for the pressed state. With nothing memorized (gated
              on memMounted so it never flashes on hydration) the control disables
              with an explanatory tooltip rather than blurring nothing. */}
          {(() => {
            const recallDisabled = memMounted && memorizedCount === 0;
            const recallTitle = recallDisabled ? t("mushaf.recallEmpty") : t("mushaf.recallHint");
            const recallAriaLabel = recallDisabled
              ? t("mushaf.recallEmpty")
              : memorizationMode
                ? t("mushaf.memorizeOff")
                : t("mushaf.memorizeOn");
            return (
              <button
                type="button"
                onClick={() => setMemorizationMode((v) => !v)}
                disabled={recallDisabled}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2 py-2 min-h-[44px] text-micro transition-colors disabled:opacity-50 disabled:pointer-events-none",
                  memorizationMode
                    ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
                    : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-gold-light/15",
                )}
                aria-label={recallAriaLabel}
                aria-pressed={memorizationMode}
                title={recallTitle}
              >
                <EyeIcon closed={memorizationMode} />
                <span className="hidden sm:inline">{t("mushaf.recall")}</span>
              </button>
            );
          })()}

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

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={t("mushaf.quickJump")}
            title={t("mushaf.quickJump")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold-light/40 dark:border-gold-dark/30 bg-bg-card dark:bg-bg-card-dark text-text-muted hover:bg-gold-light/15 px-2 py-2 min-h-[44px] text-micro transition-colors"
          >
            <SearchIcon />
            <span className="hidden sm:inline">{t("mushaf.quickJump")}</span>
            <kbd className="hidden md:inline text-micro text-text-muted/70 font-mono">⌘K</kbd>
          </button>
        </div>
      </div>

      <p className="text-center text-micro text-text-muted px-2">{t("mushaf.tapToPlayHint")}</p>

      {/* A reactive ~1024px matchMedia switch inside PlaybackSurface mounts
          exactly one presentation: at >= 1024px the docked side panel, where the
          reading column reflows beside it so the active verse stays visible;
          below that width the bottom sheet. This is the single reader-scoped
          playback surface, so the global MiniPlayer is suppressed on /mushaf. */}
      <VerseSelectionProvider value={selection}>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8 lg:items-start">
          <div data-tajweed-drill={drill || undefined} className="min-w-0">
            <MushafPage
              data={data}
              memorizationMode={memorizationMode}
              targetVerseKey={targetVerseKey}
              onPlayVerse={handlePlayVerse}
              onSelectVerse={setSelectedVerse}
            />
          </div>
          <PlaybackSurface data={data} />
        </div>
      </VerseSelectionProvider>

      {selectedVerse && /^\d{1,3}:\d{1,3}$/.test(selectedVerse) && (() => {
        const [sv, av] = selectedVerse.split(":").map(Number);
        const header = surahs.find((s) => s.number === sv);
        const surahLabel = header ? (isAr ? header.nameArabic : header.nameSimple) : "";
        const refLabel = isAr ? `${toArabicIndic(sv)}:${toArabicIndic(av)}` : `${sv}:${av}`;
        const verseMemo = memMounted && isMemorized(selectedVerse);
        const verseBm = bmMounted && isVerseBookmarked(selectedVerse);
        return (
          <div
            ref={panelRef}
            className="rounded-xl border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark p-4 space-y-3 scroll-mt-20"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-heading font-semibold">
                {surahLabel} <span className="text-text-muted font-mono text-xs">{refLabel}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => playSingleVerse(sv, av)}
                  aria-label={t("player.playVerse")}
                  title={t("player.playVerse")}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-primary dark:text-primary-light hover:bg-primary/10 transition-colors"
                >
                  <PlaySolid />
                </button>
                <button
                  type="button"
                  onClick={() => playFromVerse(sv, av)}
                  aria-label={t("player.playFromHere")}
                  title={t("player.playFromHere")}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-primary dark:text-primary-light hover:bg-primary/10 transition-colors"
                >
                  <PlayFromHereIcon />
                </button>
                {memMounted && (
                  <button
                    type="button"
                    onClick={() => toggleMemorized(selectedVerse)}
                    aria-pressed={verseMemo}
                    aria-label={verseMemo ? t("mushaf.memorizeUnmark") : t("mushaf.memorizeMark")}
                    title={verseMemo ? t("mushaf.memorizeUnmark") : t("mushaf.memorizeMark")}
                    className={cn(
                      "inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                      verseMemo
                        ? "text-primary dark:text-primary-light bg-primary/10"
                        : "text-text-muted hover:bg-bg-subtle",
                    )}
                  >
                    <HeartIcon filled={verseMemo} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleVerseBm(selectedVerse)}
                  aria-pressed={verseBm}
                  aria-label={verseBm ? t("mushaf.bookmarkVerseRemove") : t("mushaf.bookmarkVerse")}
                  title={verseBm ? t("mushaf.bookmarkVerseRemove") : t("mushaf.bookmarkVerse")}
                  className={cn(
                    "inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                    verseBm
                      ? "text-gold-dark dark:text-gold-light bg-gold/15"
                      : "text-text-muted hover:bg-bg-subtle",
                  )}
                >
                  <BookmarkIcon filled={verseBm} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVerse(null)}
                  aria-label={t("reading.close")}
                  title={t("reading.close")}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:bg-bg-subtle transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <ReadingDepth surah={sv} ayah={av} />
            {settings.showWordByWord && <WordByWord surah={sv} ayah={av} />}
            <RecitationCompare surah={sv} ayah={av} reciter={settings.reciter} />
          </div>
        );
      })()}

      <ReaderPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} surahs={surahs} />

      {/* Footer page indicator */}
      <p className="text-center text-micro text-text-muted">
        {t("mushaf.pageNumber")} {isAr ? toArabicIndic(page) : page} / {isAr ? toArabicIndic(TOTAL_PAGES) : TOTAL_PAGES}
      </p>
    </div>
  );
}
