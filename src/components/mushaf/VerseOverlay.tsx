"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic, cn } from "@/lib/utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { sheetBottomOffset, keyboardBottomOffset } from "@/lib/player-position";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { usePlayer } from "@/hooks/usePlayer";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useMemorization } from "@/hooks/useMemorization";
import { useSettings } from "@/hooks/useSettings";
import { TajweedText } from "@/components/ui/TajweedText";
import { getWordsForChapter } from "@/lib/quran-api";
import { fetchSegments, type WordSegment } from "@/lib/audio-api";
import { rangeBounds } from "@/lib/follow-along";
import type { VerseWord } from "@/lib/types";
import { useVerseSelection } from "./useVerseSelection";
import { VerseNotes } from "./VerseNotes";
import { OverlayInlineControls } from "./OverlayInlineControls";
import type { MushafPageData, ReciterId, SurahHeader } from "@/lib/types";

// Secondary surfaces of the overlay, all of which render only inside the opened
// overlay and most behind their own expandable disclosure (reciter compare, and
// the reading-depth section's translation/tafsir, word-by-word, and
// record-and-compare). Lazy-loaded so the reader's initial bundle does not carry
// their fetch/canvas/MediaRecorder weight; each splits into its own chunk and
// loads on first overlay open. The primary action row and transport stay eager
// (CONST-02: verse-tap -> open -> play must be immediate). A tiny reduced-motion
// -safe placeholder holds space while the chunk arrives.
const LazyLine = () => (
  <div
    className="h-4 w-32 rounded bg-bg-subtle dark:bg-bg-subtle-dark animate-pulse motion-reduce:animate-none"
    aria-hidden="true"
  />
);

const ReadingDepth = dynamic(
  () => import("@/components/learn/ReadingDepth").then((m) => ({ default: m.ReadingDepth })),
  { ssr: false, loading: () => <LazyLine /> },
);

const WordByWord = dynamic(
  () => import("@/components/learn/WordByWord").then((m) => ({ default: m.WordByWord })),
  { ssr: false, loading: () => <LazyLine /> },
);

const ReciterCompare = dynamic(
  () => import("./ReciterCompare").then((m) => ({ default: m.ReciterCompare })),
  { ssr: false, loading: () => <LazyLine /> },
);

const RecitationCompare = dynamic(
  () => import("./RecitationCompare").then((m) => ({ default: m.RecitationCompare })),
  { ssr: false, loading: () => <LazyLine /> },
);

// Per-verse repeat options for the stepper, lifted with MultiVerseControls from
// PlaybackSurface. "Off" (count 0/1) plays each verse once; the rest mirror the
// study UI's 2/3/5/10 set. Wired to usePlayer.setRepeatOne.
const REPEAT_OPTIONS = [0, 2, 3, 5, 10] as const;

// Inter-verse gap presets in seconds (NOT a free slider). Wired to
// usePlayer.setInterVersePause, which clamps to the nearest of these, so the set
// must stay in lockstep with the store's INTER_VERSE_PRESETS.
const GAP_PRESETS: { seconds: number; key: string }[] = [
  { seconds: 0, key: "player.gap0" },
  { seconds: 1, key: "player.gap1" },
  { seconds: 2, key: "player.gap2" },
  { seconds: 4, key: "player.gap4" },
];

// Cap on the number of chips actually rendered so selecting a whole long surah
// (up to 286 verses, Al-Baqarah) never freezes building chips. The summary count
// stays exact regardless; the overflow shows a "+K more" affordance.
const MAX_VISIBLE_CHIPS = 30;

// Past this many pixels of downward drag on the sheet's grab handle, a release
// dismisses the sheet (a smaller movement is treated as a tap that toggles the
// height); an upward drag past it expands from peek. Ported verbatim from the
// retired PlaybackSurface bottom sheet so the gesture feels identical.
const SWIPE_CLOSE_THRESHOLD = 64;

// Action-row glyphs, copied from the reading-depth panel header and the playback
// surface so the overlay reads in the same visual language. No emoji as an
// interface icon (the source's literal ✕ is replaced by CloseIcon here).
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

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const NoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Transport glyphs, lifted from PlaybackSurface so the overlay's prev/play/next
// row reads in the same visual language as the rest of the player.
const PrevIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 5h2v14H6z" />
    <path d="M18 5v14L9 12z" />
  </svg>
);

const NextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 5h2v14h-2z" />
    <path d="M6 5v14l9-7z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 5h3.5v14H7z" />
    <path d="M13.5 5H17v14h-3.5z" />
  </svg>
);

// A calm three-dot pulse for the ~100ms loading state on the play control, never
// a spinning busy glyph.
const LoadingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

// --- Lifted from PlaybackSurface (the docked panel's shared sub-parts) --------
// These move here verbatim from PlaybackSurface so the overlay carries the same
// selection + transport content without forking the logic. They command the one
// player store (usePlayer) and the one selection source (useVerseSelection);
// they construct no <audio>. The docked-panel chrome (SidePanel, BottomSheet,
// the collapse rail, the matchMedia switch, the player-position offset math) is
// deliberately NOT lifted: that is the retired docked/sheet presentation.

// The reciter readout + "Change reciter" settings link that used to sit above the
// transport was retired in Phase 4: OverlayInlineControls now shows the current
// reciter and changes it in place, so the link is no longer the way to do it. The
// ErrorLine below keeps its own settings link as an error-recovery affordance.

// Transport row at 44px targets. Commands store actions only.
function TransportRow({
  playing,
  loading,
  hasNext,
  hasPrev,
}: {
  playing: boolean;
  loading: boolean;
  hasNext: boolean;
  hasPrev: boolean;
}) {
  const { t } = useTranslation();
  const playPauseGlyph = loading ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />;
  const playPauseLabel = playing ? t("player.pause") : t("player.play");
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => usePlayer.getState().prev()}
        disabled={!hasPrev}
        aria-label={t("player.previous")}
        className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted disabled:opacity-40 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
      >
        <PrevIcon />
      </button>
      <button
        type="button"
        onClick={() => usePlayer.getState().toggle()}
        aria-label={playPauseLabel}
        title={playPauseLabel}
        className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 dark:bg-primary-light/20 text-primary dark:text-primary-light hover:bg-primary/20"
      >
        {playPauseGlyph}
      </button>
      <button
        type="button"
        onClick={() => usePlayer.getState().next()}
        disabled={!hasNext}
        aria-label={t("player.next")}
        className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted disabled:opacity-40 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
      >
        <NextIcon />
      </button>
    </div>
  );
}

// Error: a single calm line with a retry and the reciter link. Red ochre appears
// here and nowhere else on the surface. Try again re-issues a load for the
// current item by bumping loadToken, clearing the error.
function ErrorLine({ error }: { error: string }) {
  const { t } = useTranslation();
  const retry = () => {
    const s = usePlayer.getState();
    usePlayer.setState({ status: "loading", error: null, loadToken: s.loadToken + 1 });
  };
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-small">
      {/* Red ochre via the CSS var so it flips light/dark in one declaration;
          this is the single accent-destructive use here. */}
      <span className="text-[var(--accent)]">{t(error)}</span>
      <button
        type="button"
        onClick={retry}
        className="font-medium text-primary dark:text-primary-light underline underline-offset-2 hover:no-underline"
      >
        {t("player.tryAgain")}
      </button>
      <Link
        href="/settings"
        className="font-medium text-primary dark:text-primary-light underline underline-offset-2 hover:no-underline"
      >
        {t("audio.changeReciter")}
      </Link>
    </div>
  );
}

// Contiguous range entry: pick a surah present on the page, a start ayah and an
// end ayah, then build the range via setRange (which normalizes a reversed
// start/end). The range stays WITHIN ONE SURAH, matching buildRangeQueue and the
// engine's index===ayah-1 range assumption. A collapsible disclosure so it is
// reachable without cluttering every play.
function RangePicker({ data }: { data: MushafPageData }) {
  const { t, isAr } = useTranslation();
  const { setRange } = useVerseSelection();
  const [open, setOpen] = useState(false);

  const surahs = data.surahsOnPage;
  const [surah, setSurah] = useState<number>(surahs[0]?.number ?? data.verses[0]?.surah ?? 1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);

  if (surahs.length === 0) return null;

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));
  const header = surahs.find((s) => s.number === surah) ?? surahs[0];
  const versesCount = header?.versesCount ?? 1;
  const ayahOptions = Array.from({ length: versesCount }, (_, i) => i + 1);

  const apply = () => {
    setRange(surah, from, to);
    setOpen(false);
  };

  const selectClass =
    "text-micro bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px] tabular-nums";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-small font-medium text-primary dark:text-primary-light hover:underline underline-offset-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("transition-transform motion-reduce:transition-none", open && "rotate-90")}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {t("player.selectRange")}
      </button>
      {open && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-micro text-text-muted">
            {t("player.rangeSurah")}
            <select
              value={surah}
              onChange={(e) => {
                const n = Number(e.target.value);
                setSurah(n);
                setFrom(1);
                setTo(1);
              }}
              className={selectClass}
              aria-label={t("player.rangeSurah")}
            >
              {surahs.map((s) => (
                <option key={s.number} value={s.number}>
                  {isAr ? s.nameArabic : s.nameSimple}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-micro text-text-muted">
            {t("player.rangeStart")}
            <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className={selectClass} aria-label={t("player.rangeStart")}>
              {ayahOptions.map((a) => (
                <option key={a} value={a}>{num(a)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-micro text-text-muted">
            {t("player.rangeEnd")}
            <select value={to} onChange={(e) => setTo(Number(e.target.value))} className={selectClass} aria-label={t("player.rangeEnd")}>
              {ayahOptions.map((a) => (
                <option key={a} value={a}>{num(a)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center min-h-[44px] px-3 rounded-lg bg-primary/10 dark:bg-primary-light/15 text-primary dark:text-primary-light text-small font-medium hover:bg-primary/20 transition-colors motion-reduce:transition-none"
          >
            {t("player.setRange")}
          </button>
        </div>
      )}
    </div>
  );
}

// Multi-verse controls: the selection summary, capped removable chips, the
// per-verse repeat stepper, the whole-selection loop toggle, the inter-verse gap
// presets, the play-selection action, and the one-action clear. It commands the
// engine (playSet/playRange/setRepeatOne/setLoopSelection/setInterVersePause)
// and the selection hook (clear/remove); it constructs no audio. When nothing is
// selected only the range picker shows (a discoverable range entry, not a bare
// empty state). The single accent here is the play/pause-family lapis/gold; red
// ochre stays reserved for the error line.
function MultiVerseControls({ data }: { data: MushafPageData }) {
  const { t, isAr } = useTranslation();
  const { set, range, hasSelection, count, resolvedItems, remove, clear } = useVerseSelection();

  // Engine state for reflecting the control "on" states. Subscribed narrowly so
  // a time tick does not re-render the whole control block.
  const repeatOne = usePlayer((s) => s.repeatOne);
  const loopSelection = usePlayer((s) => s.loopSelection);
  const interVersePause = usePlayer((s) => s.interVersePause);

  // With no selection, show only the range picker (a discoverable range entry),
  // not a bare empty state. The summary/chips appear below once a set or range
  // exists.
  if (!hasSelection) return <RangePicker data={data} />;

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));
  const summary =
    count === 1
      ? t("player.selectionSummaryOne")
      : t("player.selectionSummary").replace("{n}", num(count));

  // The chips to render: the hand-picked set keys, or the range expanded to keys.
  // Only the first MAX_VISIBLE_CHIPS are built; the remainder collapse to a
  // "+K more" pill so a 286-verse selection never freezes.
  const allKeys = range
    ? resolvedItems().map((it) => `${it.surah}:${it.ayah}`)
    : set;
  const visibleKeys = allKeys.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = allKeys.length - visibleKeys.length;
  // Range keys have no per-chip remove (a range is one contiguous unit cleared as
  // a whole); set keys each remove individually.
  const chipsRemovable = !range;

  const refOf = (key: string) => {
    const [s, a] = key.split(":").map(Number);
    return isAr ? `${toArabicIndic(s)}:${toArabicIndic(a)}` : `${s}:${a}`;
  };

  const playSelection = () => {
    if (range) {
      usePlayer.getState().playRange(range.surah, range.from, range.to);
      return;
    }
    const items = resolvedItems();
    if (items.length > 0) usePlayer.getState().playSet(items);
  };

  // Clear is one action: empty the selection AND, if the engine is currently
  // playing the queue built from this selection, stop it so playback ends
  // cleanly. The "is this selection playing" test compares the live queue to the
  // selection's resolved items, so clearing an unrelated single-verse play is
  // left alone.
  const clearSelection = () => {
    const items = resolvedItems();
    const st = usePlayer.getState();
    const q = st.queue;
    const sameQueue =
      st.status !== "idle" &&
      q.length === items.length &&
      items.length > 0 &&
      items.every((it, i) => q[i] && q[i].surah === it.surah && q[i].ayah === it.ayah);
    if (sameQueue) st.stop();
    clear();
  };

  return (
    <section aria-label={summary} className="space-y-3">
      {/* Summary count (tabular so the digit does not jitter as it grows). */}
      <p className="text-small font-medium tabular-nums text-text dark:text-text-dark">{summary}</p>

      {/* Removable chips, capped. Each chip is a verse reference; for a
          hand-picked set the chip is a remove button, for a range the chips are
          read-only (the range clears as a unit via Clear). */}
      <div className="flex flex-wrap gap-1.5">
        {visibleKeys.map((key) =>
          chipsRemovable ? (
            // A >=44px-tall transparent hit target wrapping the compact pill, so
            // the remove control is touch-operable without bloating the chip's
            // visual size. The focus ring frames the inner pill, not the taller
            // hit area.
            <button
              key={key}
              type="button"
              onClick={() => remove(key)}
              aria-label={t("player.removeChip").replace("{ref}", refOf(key))}
              title={t("player.removeChip").replace("{ref}", refOf(key))}
              className="group inline-flex items-center min-h-[44px] focus-visible:outline-none"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 dark:bg-primary-light/15 text-primary dark:text-primary-light ps-2 pe-1.5 py-1 text-micro font-medium tabular-nums group-hover:bg-primary/20 group-focus-visible:ring-2 group-focus-visible:ring-gold group-focus-visible:ring-offset-1">
                <span>{refOf(key)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            </button>
          ) : (
            <span
              key={key}
              className="inline-flex items-center rounded-full bg-primary/10 dark:bg-primary-light/15 text-primary dark:text-primary-light px-2 py-1 text-micro font-medium tabular-nums"
            >
              {refOf(key)}
            </span>
          ),
        )}
        {overflow > 0 && (
          <span className="inline-flex items-center rounded-full bg-bg-subtle dark:bg-bg-subtle-dark text-text-muted px-2 py-1 text-micro font-medium tabular-nums">
            {t("player.chipMore").replace("{n}", num(overflow))}
          </span>
        )}
      </div>

      {/* Repeat-each stepper: a small bounded set, Off = play once. The active
          option carries the single accent; reflects the engine's repeatOne. */}
      <div className="space-y-1.5">
        <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">{t("player.repeatEach")}</p>
        <div className="flex flex-wrap gap-1.5">
          {REPEAT_OPTIONS.map((n) => {
            const active = repeatOne === n || (n === 0 && repeatOne <= 1);
            return (
              <button
                key={n}
                type="button"
                onClick={() => usePlayer.getState().setRepeatOne(n)}
                aria-pressed={active}
                className={cn(
                  "min-w-[44px] min-h-[44px] px-2 rounded-lg text-small font-medium tabular-nums border transition-colors motion-reduce:transition-none",
                  active
                    ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
                    : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
                )}
              >
                {n === 0 ? t("player.repeatOff") : `×${num(n)}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Whole-selection loop toggle (distinct from the per-verse repeat). */}
      <button
        type="button"
        onClick={() => usePlayer.getState().setLoopSelection(!loopSelection)}
        aria-pressed={loopSelection}
        className={cn(
          "inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-small font-medium border transition-colors motion-reduce:transition-none",
          loopSelection
            ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
            : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
        )}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        {t("player.loopSelection")}
      </button>

      {/* Inter-verse gap presets. The active preset carries the single accent. */}
      <div className="space-y-1.5">
        <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">{t("player.gapBetweenVerses")}</p>
        <div className="flex flex-wrap gap-1.5">
          {GAP_PRESETS.map((preset) => {
            const active = interVersePause === preset.seconds;
            return (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => usePlayer.getState().setInterVersePause(preset.seconds)}
                aria-pressed={active}
                className={cn(
                  "min-w-[44px] min-h-[44px] px-2 rounded-lg text-small font-medium tabular-nums border transition-colors motion-reduce:transition-none",
                  active
                    ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
                    : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
                )}
              >
                {t(preset.key)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Play the selection (set via playSet, range via playRange) and the
          one-action clear. Play carries the filled accent; clear is a quiet
          outline (NOT red ochre, that stays the error line only). */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={playSelection}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-primary text-on-primary hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep text-small font-medium transition-colors motion-reduce:transition-none"
        >
          <PlayIcon />
          {t("player.playSelection")}
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="inline-flex items-center min-h-[44px] px-3 rounded-lg text-small font-medium text-text-muted border border-gold-light/40 dark:border-gold-dark/30 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark transition-colors motion-reduce:transition-none"
        >
          {t("player.clearSelection")}
        </button>
      </div>
    </section>
  );
}

// Sub-verse loop control: pick a start WORD .. end WORD within the OPEN verse and
// loop just that range on the one engine, reusing the existing repeat count and
// inter-verse gap. It copies RangePicker's disclosure-with-two-selects shape but
// at word granularity within a single verse. REQUIRES segments (FOLLOW gate): it
// fetches the open verse's segments for the current reciter and, when there are
// none (every everyayah ea-* and any segment-less verse), renders nothing — only
// the whole-verse repeat above remains, with no error shown. The pickers' word
// labels come from the same word-by-word source the highlight uses (textUthmani),
// the option count from the segment count. Resolving a range to ms is the pure
// rangeBounds; engaging it is usePlayer.setSubVerseLoop (one engine, no <audio>).
// It also records the picked range in useVerseSelection for in-session UI state.
function SubVerseLoopControl({ surah, ayah }: { surah: number; ayah: number }) {
  const { t, isAr } = useTranslation();
  const { settings } = useSettings();
  const { wordRange, setWordRange, clearWordRange } = useVerseSelection();
  const [open, setOpen] = useState(false);
  // segments null = not yet known; an empty array or a resolved null both gate the
  // control off. words back the readable labels; ready flips once both resolve.
  const [segments, setSegments] = useState<WordSegment[] | null>(null);
  const [words, setWords] = useState<VerseWord[]>([]);
  const [ready, setReady] = useState(false);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  // Mounted-gate the engaged state so the toggle label never mismatches between
  // SSR and the first client render (it reads the store).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Reflect whether a sub-verse loop is currently engaged (it resets on verse
  // change / playVerse / stop, so an engaged loop belongs to this open verse).
  const loopEngaged = usePlayer((s) => s.subVerseLoop !== null);

  // Fetch the open verse's segments + words for the current reciter. fetchSegments
  // is cached and never throws; a segment-less reciter resolves null and hides the
  // control. Refetches when the verse or reciter changes; drops a stale resolve.
  useEffect(() => {
    let alive = true;
    setReady(false);
    setSegments(null);
    Promise.all([
      fetchSegments(surah, ayah, settings.reciter),
      getWordsForChapter(surah).then((map) => map[`${surah}:${ayah}`] ?? []).catch(() => []),
    ]).then(([segs, ws]) => {
      if (!alive) return;
      setSegments(segs);
      setWords(ws);
      // Default the pickers to the whole verse (first..last word) on (re)load.
      const count = segs ? segs.length : 0;
      setFrom(0);
      setTo(count > 0 ? count - 1 : 0);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [surah, ayah, settings.reciter]);

  // The FOLLOW gate: with no segments the control is unavailable (hidden), so only
  // the whole-verse repeat remains. No error, matching the no-segment fallback
  // everywhere else in the follow-along layer.
  if (!ready || !segments || segments.length === 0) return null;

  const wordCount = segments.length;
  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));
  // Word label: the Uthmani text for that index, or the 1-based number as a
  // fallback when the word list is shorter than the segments (so a select option
  // is never blank). Indices are 0-based; the visible number is 1-based.
  const labelFor = (i: number) => words[i]?.textUthmani ?? "";
  const wordOptions = Array.from({ length: wordCount }, (_, i) => i);

  const applyLoop = () => {
    const bounds = rangeBounds(segments, from, to);
    if (!bounds) return;
    // Reuse the existing repeat count from the store (the whole-verse repeat
    // stepper), defaulting to 3 passes when repeat is off, per the plan.
    const count = usePlayer.getState().repeatOne || 3;
    usePlayer.getState().setSubVerseLoop(bounds.startMs, bounds.endMs, count);
    setWordRange(surah, ayah, from, to);
  };

  const stopLoop = () => {
    usePlayer.getState().clearSubVerseLoop();
    clearWordRange();
  };

  // The toggle is engaged when a loop is running AND the in-session word range is
  // for this verse (so reopening the overlay on a looping verse shows "Stop").
  const engagedHere =
    mounted &&
    loopEngaged &&
    !!wordRange &&
    wordRange.surah === surah &&
    wordRange.ayah === ayah;

  const selectClass =
    "text-micro bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px] max-w-[8rem]";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-small font-medium text-primary dark:text-primary-light hover:underline underline-offset-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("transition-transform motion-reduce:transition-none", open && "rotate-90")}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {t("player.subVerseLoop")}
      </button>
      {open && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-micro text-text-muted">
              {t("player.subVerseFrom")}
              <select
                value={from}
                onChange={(e) => setFrom(Number(e.target.value))}
                className={selectClass}
                aria-label={t("player.subVerseFrom")}
                dir={isAr ? "rtl" : "ltr"}
              >
                {wordOptions.map((i) => (
                  <option key={i} value={i}>
                    {num(i + 1)}. {labelFor(i)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-micro text-text-muted">
              {t("player.subVerseTo")}
              <select
                value={to}
                onChange={(e) => setTo(Number(e.target.value))}
                className={selectClass}
                aria-label={t("player.subVerseTo")}
                dir={isAr ? "rtl" : "ltr"}
              >
                {wordOptions.map((i) => (
                  <option key={i} value={i}>
                    {num(i + 1)}. {labelFor(i)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyLoop}
              aria-pressed={engagedHere}
              className={cn(
                "inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg text-small font-medium border transition-colors motion-reduce:transition-none",
                engagedHere
                  ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
                  : "bg-primary text-on-primary hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep border-transparent",
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {t("player.loopWords")}
            </button>
            {engagedHere && (
              <button
                type="button"
                onClick={stopLoop}
                className="inline-flex items-center min-h-[44px] px-3 rounded-lg text-small font-medium text-text-muted border border-gold-light/40 dark:border-gold-dark/30 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark transition-colors motion-reduce:transition-none"
              >
                {t("player.stopLoop")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// The reading-depth section: an opt-in disclosure holding the existing
// translation/tafsir, word-by-word (when enabled), and record-and-compare
// surfaces, mounted unchanged. A standalone component so its open state resets
// by remount (keyed by verseKey at the call site) when the open verse changes,
// without a reset effect. All read-only religious content; RecitationCompare
// records the user's own voice into its own clip element (the lone allowed extra
// audio), it is not a second playback path.
function ReadingDepthSection({
  surah,
  ayah,
  reciter,
  showWordByWord,
}: {
  surah: number;
  ayah: number;
  reciter: ReciterId;
  showWordByWord: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-small font-medium text-primary dark:text-primary-light hover:underline underline-offset-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("transition-transform motion-reduce:transition-none", open && "rotate-90")}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {t("player.readingDepth")}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <ReadingDepth surah={surah} ayah={ayah} />
          {showWordByWord && <WordByWord surah={surah} ayah={ayah} />}
          <RecitationCompare surah={surah} ayah={ayah} reciter={reciter} />
        </div>
      )}
    </div>
  );
}

// One focused surface for a single verse, opened over a dimmed, inert page. It
// replaces the page-shrinking docked panel as the primary verse interaction on a
// pointer device: tapping a verse opens this, and everything the learner can do
// to that verse lives here instead of as inline buttons on the page.
//
// The mechanics (portal to body, inert when closed, ref-counted body-scroll
// lock, opener focus capture/restore, Tab trap, Escape + scrim-tap + explicit
// close, reduced-motion-aware entrance) are the proven pattern shared with
// ReaderPalette and OnboardingTour; this mirrors them rather than inventing a
// second overlay primitive. Playback commands the single global player store
// through the helpers passed in from the reader, so there is no second <audio>.
//
// The centered panel is the pointer form. The touch bottom-sheet form is a
// later variant of this same shell, not a fork.

interface VerseOverlayProps {
  open: boolean;
  onClose: () => void;
  // "surah:ayah"; null when nothing is open. Parsed into sv/av for the body.
  verseKey: string | null;
  data: MushafPageData;
  surahs: SurahHeader[];
  // Passed in so surah-name / reciter / speed resolution stays in the reader
  // (one place); the overlay just commands them.
  playSingleVerse: (sv: number, av: number) => void;
  playFromVerse: (sv: number, av: number) => void;
  // Reveal-as-recited in-session state, owned by MushafReader (like
  // memorizationMode) so the page and this overlay share one source. The toggle
  // here flips it; MushafPage reads it to uncover the playing verse word-by-word.
  // Optional so the overlay still renders without the pair (the toggle is then
  // omitted); when present, the toggle shows beside the playback controls.
  revealAsRecited?: boolean;
  onToggleRevealAsRecited?: () => void;
}

export function VerseOverlay({
  open,
  onClose,
  verseKey,
  data,
  surahs,
  playSingleVerse,
  playFromVerse,
  revealAsRecited,
  onToggleRevealAsRecited,
}: VerseOverlayProps) {
  const { t, isAr } = useTranslation();
  const { settings } = useSettings();
  const { isMemorized, toggle: toggleMemorized, mounted: memMounted } = useMemorization();
  const { isBookmarked: isVerseBookmarked, toggle: toggleVerseBm, mounted: bmMounted } = useBookmarks();
  // Live player state for the transport row and the error line. Subscribed
  // narrowly so a time tick does not re-render the whole overlay; the row
  // commands the same single store through usePlayer.getState().
  const status = usePlayer((s) => s.status);
  const hasNext = usePlayer((s) => s.index < s.queue.length - 1);
  const hasPrev = usePlayer((s) => s.index > 0);
  const playerError = usePlayer((s) => s.error);
  const panelRef = useRef<HTMLDivElement>(null);
  // The note-section wrapper. The action-row note button reveals this region and
  // scrolls it into view (and focuses VerseNotes' first control), so a brand-new
  // note opens from the row even though VerseNotes itself starts collapsed.
  const notesRef = useRef<HTMLDivElement>(null);
  // The "play this verse" control: the auto-focused primary so Enter/tap plays
  // immediately on open. Pointed at the button in the action row below.
  const primaryRef = useRef<HTMLButtonElement>(null);
  // The element focused when the overlay opened (the tapped verse button), so
  // closing returns focus there instead of letting it fall to <body>.
  const openerRef = useRef<HTMLElement | null>(null);

  // Panel (>=1024) vs bottom-sheet (<1024) chrome. null until the post-mount
  // measure resolves; while null the dialog is held at the closed/opacity-0
  // state below so neither form's chrome flashes on the first frame (a phone
  // never sees a centered panel, the MOBILE-01 surface). matchMedia resolves in
  // the hook's mount effect right after first paint, so this is a one-frame
  // delay, not a wrong-form flash.
  const isDesktop = useIsDesktop();
  const isSheet = isDesktop === false;

  // Sheet height: peek shows the compact top, expanded the full body. The
  // overlay opens already expanded (a verse tap is a deliberate open, unlike
  // PlaybackSurface which opened in peek), but the peek/expanded split is kept so
  // an upward drag still expands and the handle tap still toggles the height.
  const [sheetState, setSheetState] = useState<"peek" | "expanded">("expanded");
  const expanded = sheetState === "expanded";
  // Pointer-drag bookkeeping for the grab handle (start Y + running delta).
  const dragRef = useRef<{ startY: number; delta: number } | null>(null);

  // Reset to expanded whenever the overlay (re)opens, so reopening for a new
  // verse never lands in a stale peek left from a previous handle tap.
  useEffect(() => {
    if (open) setSheetState("expanded");
  }, [open]);

  // The sheet's bottom offset in CSS pixels, ported from PlaybackSurface: it
  // reserves the tab-bar strip only in peek below 768px (sheetBottomOffset); when
  // the keyboard is up it rides the visual viewport so the focused note field
  // stays above the keyboard inset. Recomputed on window resize/orientationchange
  // and visualViewport resize/scroll, all four listeners removed in cleanup. Only
  // runs while open (guarded like the scroll lock), so it does nothing for the
  // panel form.
  const [bottomOffset, setBottomOffset] = useState(0);
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const recompute = () => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const keyboard = vv
        ? keyboardBottomOffset(window.innerHeight, vv.height, vv.offsetTop)
        : 0;
      setBottomOffset(keyboard > 0 ? keyboard : sheetBottomOffset(viewport, expanded));
    };
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    vv?.addEventListener("resize", recompute);
    vv?.addEventListener("scroll", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
      vv?.removeEventListener("resize", recompute);
      vv?.removeEventListener("scroll", recompute);
    };
  }, [open, expanded]);

  // Grab-handle drag, ported from PlaybackSurface with one adaptation: a
  // swipe-down past the threshold calls the overlay's onClose (close the overlay,
  // KEEP audio playing and the verse visible), NEVER the player's stop(). An
  // upward drag past the threshold expands; a small movement is a tap that
  // toggles peek<->expanded.
  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, delta: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) dragRef.current.delta = e.clientY - dragRef.current.startY;
  };
  const onHandlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.delta > SWIPE_CLOSE_THRESHOLD) {
      onClose();
    } else if (drag.delta < -SWIPE_CLOSE_THRESHOLD) {
      setSheetState("expanded");
    } else {
      setSheetState((s) => (s === "peek" ? "expanded" : "peek"));
    }
  };
  // An OS-level interrupt (incoming call, multitasking swipe) fires pointercancel
  // instead of pointerup; drop the in-flight drag so a stale delta can never
  // trigger a spurious dismiss on the next event.
  const onHandlePointerCancel = () => {
    dragRef.current = null;
  };

  // Stable ids tie the dialog's accessible name to the verse reference and its
  // description to the verse text.
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const bodyId = `${baseId}-body`;

  // Portal target exists only in the browser; mounted gates SSR so the dialog
  // never renders during hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Capture the opener and move initial focus to the primary control after
  // paint; restore focus to the opener on close. This is what returns focus to
  // the triggering verse.
  useEffect(() => {
    if (open) {
      openerRef.current = (document.activeElement as HTMLElement) ?? null;
      const id = requestAnimationFrame(() => primaryRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    openerRef.current?.focus?.();
    openerRef.current = null;
    return undefined;
  }, [open]);

  // Body-scroll lock via the shared ref-counted source: locked while open,
  // released on close/unmount. Exactly one lock per open, so it coordinates with
  // any other overlay through the single counter.
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  // Trap Tab within the dialog (wrap first <-> last), identical to ReaderPalette
  // / OnboardingTour.
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Escape closes; everything else delegates to the Tab trap. Escape lives on
  // the container's synthetic onKeyDown only, NOT a document listener: a
  // document-level Escape would collide with the quick-jump palette's
  // stopImmediatePropagation guard (which exists so closing the palette never
  // reaches the playback Escape -> stop()). The React synthetic handler does not.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    trapTab(e);
  };

  // Parse the open verse read-only. A null or malformed key renders no verse
  // body (the shell can still be inert/closed); a valid key drives the header
  // and the action row.
  const valid = !!verseKey && /^\d{1,3}:\d{1,3}$/.test(verseKey);
  const [sv, av] = valid ? verseKey!.split(":").map(Number) : [0, 0];
  const header = valid ? surahs.find((s) => s.number === sv) : undefined;
  const surahLabel = header ? (isAr ? header.nameArabic : header.nameSimple) : "";
  const refLabel = valid ? (isAr ? `${toArabicIndic(sv)}:${toArabicIndic(av)}` : `${sv}:${av}`) : "";
  // The tajweed markup for this verse, looked up read-only from the page data;
  // if the verse is not on this page the Arabic is omitted rather than guessed.
  const verse = valid ? data.verses.find((v) => v.surah === sv && v.ayah === av) : undefined;
  // Memorize / bookmark filled state is gated on each hook's mounted flag so the
  // store-derived fill never mismatches between SSR and the first client render.
  const verseMemo = valid && memMounted && isMemorized(verseKey!);
  const verseBm = valid && bmMounted && isVerseBookmarked(verseKey!);

  // Reveal the note region from the action-row note button: scroll it into view
  // and move focus to its first control (VerseNotes' "Add a note" button when the
  // verse has no note yet, or its textarea once a note exists), so the row button
  // has a real destination and a brand-new note is one Enter away, never inert.
  const goToNote = () => {
    const region = notesRef.current;
    if (!region) return;
    region.scrollIntoView({ block: "nearest" });
    region.querySelector<HTMLElement>(
      'button, textarea, input, a[href], [tabindex]:not([tabindex="-1"])',
    )?.focus();
  };

  // Transport state for the lifted row. Loading and stopped both read as "play"
  // intent; only an actively playing verse shows pause.
  const playing = status === "playing";
  const loading = status === "loading";

  // The visible entrance is gated on the width resolving so a phone never flashes
  // the centered panel for one frame: while isDesktop is null (the pre-measure
  // frame) the dialog and scrim stay at the closed/opacity-0 state, painting
  // NEITHER form's chrome; the rise/fade begins only once open AND the form is
  // known. Inertness and pointer/dismiss wiring still key on `open` directly so
  // closing is immediate. matchMedia resolves right after first paint, so this is
  // an imperceptible one-frame delay, not a wrong-form flash.
  const entered = open && isDesktop !== null;

  const content = (
    <div role="presentation" inert={!open}>
      {/* Scrim: the ink at ~60%, a faint backdrop blur as a focus aid only (not a
          frosted aesthetic). Identical for both forms. Tap = dismiss. Its visible
          opacity follows `entered` so it does not flash before the form resolves;
          pointer-events still key on `open`. Fades at the short motion duration. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity [transition-duration:var(--motion-short)] motion-reduce:transition-none",
          entered ? "opacity-100" : "opacity-0",
          open ? "" : "pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Container; Escape + Tab trap live here. Centered for the panel, bottom
          aligned for the sheet so the dialog rises from the bottom edge. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] flex",
          isSheet ? "items-end justify-center" : "items-center justify-center px-4 py-8",
          open ? "" : "pointer-events-none",
        )}
        onKeyDown={onKeyDown}
      >
        {/* ONE dialog box, ONE onKeyDown, ONE body — only the chrome differs by
            width. The panel rises from 0.98 scale at the medium duration; the
            sheet is fixed to the bottom edge (its `bottom` reserves the tab bar /
            lifts above the keyboard) and rises with a transform. Reduced motion
            is opacity-only for both. */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          aria-describedby={bodyId}
          style={
            isSheet
              ? { bottom: bottomOffset, boxShadow: "0 -8px 32px -16px rgba(16,20,32,0.40)" }
              : { boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)" }
          }
          className={cn(
            isSheet
              ? // Bottom sheet: full width, top corners rounded, capped height with
                // internal scroll so the verse it concerns stays visible above it
                // and long verses stay reachable. z-[60] matches the shared scrim
                // (NOT PlaybackSurface's z-40). safe-bottom reserves the home-bar.
                // Height follows peek/expanded so the handle's toggle/drag is real:
                // expanded fills toward 80vh, peek shrinks back so more of the verse
                // shows above. Never full-height in either state.
                cn(
                  "fixed inset-x-0 z-[60] flex flex-col overflow-y-auto overscroll-contain rounded-t-2xl border-t border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark px-5 pb-5 safe-bottom transition-[transform,max-height] [transition-duration:var(--motion-short)] motion-reduce:transition-none",
                  expanded ? "max-h-[80vh]" : "max-h-[45vh]",
                )
              : "w-[calc(100%-2rem)] max-w-[560px] max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark p-6 sm:p-8 transition-[opacity,transform] [transition-duration:var(--motion-medium)] [transition-timing-function:var(--ease-out)] motion-reduce:transition-none",
            entered
              ? "opacity-100 scale-100 translate-y-0"
              : isSheet
                ? "opacity-0 translate-y-full"
                : "opacity-0 scale-[0.98]",
          )}
        >
          {/* Grab handle: a 36x4px bar inside a >=44px-tall touch target, at the
              TOP of the sheet above the body. Tap toggles peek/expanded, swipe
              down dismisses (onClose), swipe up expands. Sheet form only. */}
          {isSheet && (
            <button
              type="button"
              aria-label={t("player.grabHandle")}
              aria-expanded={expanded}
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerCancel}
              className="flex items-center justify-center w-full h-11 -mb-2 touch-none"
            >
              <span
                className="block w-9 h-1 rounded-full"
                style={{ backgroundColor: "var(--text-muted)", opacity: 0.4 }}
                aria-hidden="true"
              />
            </button>
          )}

          {/* Header: eyebrow + the verse reference (the dialog's accessible
              name), then the verse Arabic read-only. */}
          <div id={labelId}>
            <span className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
              {t("mushaf.verseOverlayTitle")}
            </span>
            <p className="mt-1 font-heading text-h4 font-semibold text-text dark:text-text-dark">
              {surahLabel}{" "}
              <span className="font-mono text-body text-text-muted tabular-nums">{refLabel}</span>
            </p>
          </div>

          {/* The verse text in Amiri Quran via the existing tajweed renderer
              (read-only markup); omitted when the verse is not on this page. */}
          {verse && (
            <div id={bodyId} className="mt-3">
              <TajweedText
                tajweedHtml={verse.tajweedHtml}
                className="!text-[1.25rem] !leading-[2.0]"
              />
            </div>
          )}

          {/* Primary action row: play this verse (the auto-focused primary),
              play from here, memorize, bookmark, note, close. Touch-sized
              targets; logical properties keep it correct in RTL. */}
          <div className="mt-5 flex flex-wrap items-center gap-1">
            <button
              ref={primaryRef}
              type="button"
              onClick={() => {
                if (verse) playSingleVerse(sv, av);
              }}
              aria-label={t("player.playVerse")}
              title={t("player.playVerse")}
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-primary dark:text-primary-light hover:bg-primary/10 transition-colors"
            >
              <PlaySolid />
            </button>
            <button
              type="button"
              onClick={() => {
                if (valid) playFromVerse(sv, av);
              }}
              aria-label={t("player.playFromHere")}
              title={t("player.playFromHere")}
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-primary dark:text-primary-light hover:bg-primary/10 transition-colors"
            >
              <PlayFromHereIcon />
            </button>
            {memMounted && (
              <button
                type="button"
                onClick={() => {
                  if (valid) toggleMemorized(verseKey!);
                }}
                aria-pressed={verseMemo}
                aria-label={verseMemo ? t("mushaf.memorizeUnmark") : t("mushaf.memorizeMark")}
                title={verseMemo ? t("mushaf.memorizeUnmark") : t("mushaf.memorizeMark")}
                className={cn(
                  "inline-flex items-center justify-center w-11 h-11 rounded-lg transition-colors",
                  verseMemo
                    ? "text-primary dark:text-primary-light bg-primary/10"
                    : "text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
                )}
              >
                <HeartIcon filled={verseMemo} />
              </button>
            )}
            {bmMounted && (
              <button
                type="button"
                onClick={() => {
                  if (valid) toggleVerseBm(verseKey!);
                }}
                aria-pressed={verseBm}
                aria-label={verseBm ? t("mushaf.bookmarkVerseRemove") : t("mushaf.bookmarkVerse")}
                title={verseBm ? t("mushaf.bookmarkVerseRemove") : t("mushaf.bookmarkVerse")}
                className={cn(
                  "inline-flex items-center justify-center w-11 h-11 rounded-lg transition-colors",
                  verseBm
                    ? "text-gold-dark dark:text-gold-light bg-gold/15"
                    : "text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
                )}
              >
                <BookmarkIcon filled={verseBm} />
              </button>
            )}
            <button
              type="button"
              onClick={goToNote}
              aria-label={t("notes.add")}
              title={t("notes.add")}
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark transition-colors"
            >
              <NoteIcon />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("reading.close")}
              title={t("reading.close")}
              className="ms-auto inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Playback + selection: the transport (prev / play / next) and the
              multi-verse controls (range picker when nothing is selected;
              summary + capped chips + repeat stepper + loop toggle + gap presets
              + play-selection + clear once a selection exists). All lifted from
              PlaybackSurface; all command the one store + selection source, no
              second <audio>. The reciter / speed / translation-source controls
              sit in their own section below. */}
          {valid && (
            <section
              aria-label={t("player.selectionControls")}
              className="mt-5 space-y-3 border-t border-border pt-4"
            >
              <TransportRow playing={playing} loading={loading} hasNext={hasNext} hasPrev={hasPrev} />
              <MultiVerseControls data={data} />
              {/* Sub-verse word-range loop: loop a start..end WORD range within
                  this verse on the one engine, reusing the repeat count + gap
                  above. Keyed by verseKey so its segment fetch + open state reset
                  when the open verse changes; self-hides when the reciter has no
                  segments for the verse (only whole-verse repeat then remains). */}
              <SubVerseLoopControl key={verseKey!} surah={sv} ayah={av} />
              {playerError && <ErrorLine error={playerError} />}
            </section>
          )}

          {/* Reveal-as-recited toggle: blur the verse and uncover each word as it
              is recited (a self-test for any verse, not only memorized ones). An
              in-session toggle owned by the reader, copying the loop toggle's exact
              shape (aria-pressed, 44px target, bg-primary/15 active). It sits with
              the playback affordances; MushafPage reads the shared state to uncover
              the playing verse word-by-word, falling back to the whole-verse reveal
              when the reciter has no word segments. Omitted when the reader does
              not pass the toggle pair. */}
          {valid && onToggleRevealAsRecited && (
            <div className="mt-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={onToggleRevealAsRecited}
                aria-pressed={!!revealAsRecited}
                aria-label={revealAsRecited ? t("player.revealAsRecitedOff") : t("player.revealAsRecitedOn")}
                title={t("player.revealAsRecitedHint")}
                className={cn(
                  "inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-small font-medium border transition-colors motion-reduce:transition-none",
                  revealAsRecited
                    ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
                    : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {t("player.revealAsRecited")}
              </button>
            </div>
          )}

          {/* Reciter / speed / translation source: the inline controls bound to
              the one settings store (settings.reciter / playbackSpeed /
              translationId). It writes settings only — the one usePlayer engine
              reads the reciter and speed on the next play, and the reading-depth
              panel re-fetches when the translation id changes. This is the
              "reciter and speed and translation source" slot of the
              DESIGN_SYSTEM_V2 content order, and it replaces the old "Change
              reciter -> /settings" link. No second <audio>, no second store. */}
          {valid && (
            <div className="mt-3 border-t border-border pt-4">
              <OverlayInlineControls />
            </div>
          )}

          {/* Reciter A/B compare: hear this verse by two reciters back to back.
              Self-contained and collapsible; plays through the one engine
              (usePlayer.playVerse), no second <audio>. */}
          {valid && (
            <div className="mt-3">
              <ReciterCompare surah={sv} ayah={av} surahName={surahLabel || null} />
            </div>
          )}

          {/* Per-verse private note (local-only, the learner's own words). Keyed
              by verseKey so it re-syncs when the open verse changes. Always
              rendered so an existing note shows and the action-row note button
              has a destination to scroll to and focus. */}
          {valid && (
            <div ref={notesRef} className="mt-3 scroll-mt-4">
              <VerseNotes key={verseKey!} verseKey={verseKey!} />
            </div>
          )}

          {/* Reading depth: an opt-in disclosure holding translation + tafsir,
              the word-by-word breakdown (when enabled), and record-and-compare.
              Keyed by verseKey so it collapses fresh when the open verse changes.
              All read-only religious content (RecitationCompare records the
              user's own voice into its own clip — the lone allowed extra audio). */}
          {valid && (
            <div className="mt-3">
              <ReadingDepthSection
                key={verseKey!}
                surah={sv}
                ayah={av}
                reciter={settings.reciter}
                showWordByWord={!!settings.showWordByWord}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(content, document.body) : null;
}
