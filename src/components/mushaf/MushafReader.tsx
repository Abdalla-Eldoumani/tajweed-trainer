"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { usePlayer } from "@/hooks/usePlayer";
import { useMemorization } from "@/hooks/useMemorization";
import { pageForJuz, pageForSurah, surahForPage, TOTAL_JUZ } from "@/lib/navigation";
import { clampJuz } from "@/lib/validate";
import { setLastRead } from "@/lib/storage";
import { toArabicIndic, cn } from "@/lib/utils";
import { ColorLegend } from "@/components/learn/ColorLegend";
import { MushafPage } from "./MushafPage";
import { VerseOverlay } from "./VerseOverlay";
import { ReaderPalette } from "./ReaderPalette";
import { VerseSelectionProvider, useVerseSelectionState } from "./useVerseSelection";
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

// A crosshair/target for reading focus mode: a ring with a center dot and four
// edge ticks. Distinct from the recall eye so the two toolbar toggles never read
// the same at a glance.
const FocusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
  </svg>
);

// A small underline-of-a-word glyph for the follow-along toggle: a short word
// run with an emphasis bar beneath it, echoing the active-word underline the
// highlight draws. Distinct from the focus crosshair and the recall eye.
const FollowAlongIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="16" x2="11" y2="16" />
    <line x1="14" y1="16" x2="20" y2="16" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PaletteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.926.746-1.688 1.688-1.688H16c3.314 0 6-2.686 6-6 0-4.972-4.5-9-10-9z" />
  </svg>
);

export function MushafReader({ page, data, surahs }: MushafReaderProps) {
  const { settings, updateSettings } = useSettings();
  const { t, isAr } = useTranslation();
  const router = useRouter();
  const { count: memorizedCount, mounted: memMounted } = useMemorization();
  // localStorage isn't available on the server, so any UI driven by it
  // (bookmark fill, last-page label) waits for client hydration.
  const [mounted, setMounted] = useState(false);
  // Memorization mode hides verse text the user has marked memorized so they
  // can recall it. Off by default; in-session state, not persisted.
  const [memorizationMode, setMemorizationMode] = useState(false);
  // Reveal-as-recited: blur the verse being recited and uncover each word as it
  // is recited. Owned here (like memorizationMode) so the page and the verse
  // overlay share one source: the overlay toggle flips it and MushafPage reads it.
  // In-session reader-local state, reset on a route change, never persisted.
  const [revealAsRecited, setRevealAsRecited] = useState(false);
  // Reading focus mode: dim every verse except the active one (the playing verse,
  // else the single selected verse). Verse-level and segment-independent, so it
  // works for every reciter and with audio paused. Off by default; in-session
  // reader-local state like memorizationMode, reset on a route change, never persisted.
  const [focusMode, setFocusMode] = useState(false);
  // The Cmd/Ctrl+K quick-jump palette. In-session, not persisted.
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Single-rule highlight drill: greys every tajweed rule except the chosen one.
  const [drill, setDrill] = useState("");
  // The color legend disclosure. It is the keyboard/screen-reader path to the
  // tajweed colors (the hover popover's trigger is pointer-only and not
  // focusable), so it is a plain in-flow panel: no portal, focus trap, or
  // scroll lock. In-session reader-local state like drill; not persisted.
  const [legendOpen, setLegendOpen] = useState(false);
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

  // Warm the adjacent pages so the common forward read (and a step back) is
  // instant. These routes are ISR/SSG but most pages are not pre-rendered, so a
  // cold jump can stall on the data fetch; prefetching the neighbors hides that
  // latency. This only primes the router cache and changes no navigation
  // behavior. Boundaries (page 1 / 604) skip the out-of-range neighbor.
  useEffect(() => {
    if (page > 1) router.prefetch(`/mushaf/page/${page - 1}`);
    if (page < TOTAL_PAGES) router.prefetch(`/mushaf/page/${page + 1}`);
  }, [page, router]);

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

  // Play a single verse (single mode). Passed to the overlay's auto-focused
  // "play this verse" control, so opening the overlay and playing share one code
  // path and the loading state appears within 100ms (playVerse sets status
  // "loading" synchronously).
  const playSingleVerse = (sv: number, av: number) => {
    const header = surahs.find((s) => s.number === sv);
    usePlayer.getState().playVerse(sv, av, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: header ? (isAr ? header.nameArabic : header.nameSimple) : null,
    });
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

          {/* Reading focus mode: dims every verse but the active one (the playing
              verse, else the single selected verse). Verse-level and
              segment-independent, so it needs no reciter/mounted gate beyond the
              reader's own — it reads the live playing/selected verse. Same
              toolbar-toggle shape as the recall eye: label beside the icon (>=sm),
              aria-pressed for state, the on/off aria-label pair, and the hint in
              the title. */}
          <button
            type="button"
            onClick={() => setFocusMode((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2 py-2 min-h-[44px] text-micro transition-colors",
              focusMode
                ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
                : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-gold-light/15",
            )}
            aria-label={focusMode ? t("mushaf.focusModeOff") : t("mushaf.focusModeOn")}
            aria-pressed={focusMode}
            title={t("mushaf.focusModeHint")}
          >
            <FocusIcon />
            <span className="hidden sm:inline">{t("mushaf.focusMode")}</span>
          </button>

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

          {/* The keyboard/all-modes path to the tajweed colors: a plain
              disclosure that opens the shared ColorLegend in flow below the
              toolbar. The popover on a colored letter is pointer-only, so this
              toggle (in the tab order, pressed/expanded state announced) is the
              accessible route to the same names + swatches. */}
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            aria-label={t("mushaf.legend")}
            title={t("mushaf.legend")}
            aria-pressed={legendOpen}
            aria-expanded={legendOpen}
            aria-controls="mushaf-color-legend"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2 py-2 min-h-[44px] text-micro transition-colors",
              legendOpen
                ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
                : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-gold-light/15",
            )}
          >
            <PaletteIcon />
            <span className="hidden sm:inline">{t("mushaf.legend")}</span>
          </button>
        </div>
      </div>

      <p className="text-center text-micro text-text-muted px-2">{t("mushaf.tapToPlayHint")}</p>

      {/* The legend panel: a plain in-flow disclosure (no portal/trap/lock) so
          it stays in the tab order as the a11y path to the colors. ColorLegend
          reads only the verified tajweed map, so no rule prose is introduced. */}
      {legendOpen && (
        <div id="mushaf-color-legend" className="px-2">
          <ColorLegend />
        </div>
      )}

      {/* A plain verse tap opens the focused verse overlay (the auto-focused
          "play this verse" plays it); the overlay replaces the old page-shrinking
          docked panel, so the reading column stays full width and never reflows
          to a second column. The overlay portals to the body but must sit
          lexically inside VerseSelectionProvider so its range/repeat/loop/gap
          controls resolve the one selection (useVerseSelection throws otherwise).
          With the surface as an overlay, the global MiniPlayer is suppressed on
          /mushaf as before. */}
      <VerseSelectionProvider value={selection}>
        <div data-tajweed-drill={drill || undefined} className="min-w-0">
          <MushafPage
            data={data}
            memorizationMode={memorizationMode}
            revealAsRecited={revealAsRecited}
            focusMode={focusMode}
            targetVerseKey={targetVerseKey}
            onPlayVerse={setSelectedVerse}
            onSelectVerse={setSelectedVerse}
          />
        </div>
        <VerseOverlay
          open={!!selectedVerse}
          verseKey={selectedVerse}
          onClose={() => setSelectedVerse(null)}
          data={data}
          surahs={surahs}
          playSingleVerse={playSingleVerse}
          playFromVerse={playFromVerse}
          revealAsRecited={revealAsRecited}
          onToggleRevealAsRecited={() => setRevealAsRecited((v) => !v)}
        />
      </VerseSelectionProvider>

      <ReaderPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} surahs={surahs} />

      {/* Footer page indicator */}
      <p className="text-center text-micro text-text-muted">
        {t("mushaf.pageNumber")} {isAr ? toArabicIndic(page) : page} / {isAr ? toArabicIndic(TOTAL_PAGES) : TOTAL_PAGES}
      </p>
    </div>
  );
}
