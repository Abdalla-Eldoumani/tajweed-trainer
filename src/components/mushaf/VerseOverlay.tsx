"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic, cn } from "@/lib/utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { usePlayer } from "@/hooks/usePlayer";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useMemorization } from "@/hooks/useMemorization";
import { getRecitation } from "@/lib/reciters";
import { ArabicText } from "@/components/ui/ArabicText";
import { TajweedText } from "@/components/ui/TajweedText";
import { useVerseSelection } from "./useVerseSelection";
import type { MushafPageData, SurahHeader } from "@/lib/types";

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

// Reciter name + a change affordance pointing at settings. Phase 4 replaces this
// "Change reciter" link with an inline reciter/speed/translation-source selector
// in the overlay; this line is the current seam for that work.
function ReciterLine({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2 text-small">
      <ArabicText
        text={name}
        size="sm"
        className="!text-small !leading-[1.5] text-text-muted truncate min-w-0"
      />
      <Link
        href="/settings"
        className="shrink-0 font-medium text-primary dark:text-primary-light underline underline-offset-2 hover:no-underline"
      >
        {t("audio.changeReciter")}
      </Link>
    </div>
  );
}

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
            <button
              key={key}
              type="button"
              onClick={() => remove(key)}
              aria-label={t("player.removeChip").replace("{ref}", refOf(key))}
              title={t("player.removeChip").replace("{ref}", refOf(key))}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 dark:bg-primary-light/15 text-primary dark:text-primary-light ps-2 pe-1.5 py-1 text-micro font-medium tabular-nums hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1"
            >
              <span>{refOf(key)}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
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
                  "min-w-[44px] min-h-[36px] px-2 rounded-lg text-small font-medium tabular-nums border transition-colors motion-reduce:transition-none",
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
          "inline-flex items-center gap-2 min-h-[36px] px-3 rounded-lg text-small font-medium border transition-colors motion-reduce:transition-none",
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
                  "min-w-[44px] min-h-[36px] px-2 rounded-lg text-small font-medium tabular-nums border transition-colors motion-reduce:transition-none",
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
}

export function VerseOverlay({
  open,
  onClose,
  verseKey,
  data,
  surahs,
  playSingleVerse,
  playFromVerse,
}: VerseOverlayProps) {
  const { t, isAr } = useTranslation();
  const { isMemorized, toggle: toggleMemorized, mounted: memMounted } = useMemorization();
  const { isBookmarked: isVerseBookmarked, toggle: toggleVerseBm, mounted: bmMounted } = useBookmarks();
  // Live player state for the transport row, the reciter line, and the error
  // line. Subscribed narrowly so a time tick does not re-render the whole
  // overlay; the row commands the same single store through usePlayer.getState().
  const status = usePlayer((s) => s.status);
  const reciterId = usePlayer((s) => s.reciter);
  const hasNext = usePlayer((s) => s.index < s.queue.length - 1);
  const hasPrev = usePlayer((s) => s.index > 0);
  const playerError = usePlayer((s) => s.error);
  const panelRef = useRef<HTMLDivElement>(null);
  // The note section is mounted into this seam in a following step; the note
  // control scrolls it into view. Empty for now so no note content is fabricated.
  const noteSeamRef = useRef<HTMLDivElement>(null);
  // The "play this verse" control: the auto-focused primary so Enter/tap plays
  // immediately on open. Pointed at the button in the action row below.
  const primaryRef = useRef<HTMLButtonElement>(null);
  // The element focused when the overlay opened (the tapped verse button), so
  // closing returns focus there instead of letting it fall to <body>.
  const openerRef = useRef<HTMLElement | null>(null);

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

  // Reveal the note section (mounted in a following step): scroll its seam into
  // view so the note control has a real destination without fabricating content.
  const goToNote = () => {
    noteSeamRef.current?.scrollIntoView({ block: "nearest" });
  };

  // Transport state for the lifted row. Loading and stopped both read as "play"
  // intent; only an actively playing verse shows pause.
  const playing = status === "playing";
  const loading = status === "loading";
  const reciter = getRecitation(reciterId);
  const reciterName = reciter ? (isAr ? reciter.nameAr : reciter.nameEn) : reciterId;

  const content = (
    <div role="presentation" inert={!open}>
      {/* Scrim: the ink at ~60%, a faint backdrop blur as a focus aid only (not a
          frosted aesthetic). Tap = dismiss. Fades at the short motion duration. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity [transition-duration:var(--motion-short)] motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered container; Escape + Tab trap live here. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center px-4 py-8",
          open ? "" : "pointer-events-none",
        )}
        onKeyDown={onKeyDown}
      >
        {/* Panel rises from 0.98 scale at the medium duration with the standard
            ease-out; reduced motion is opacity-only. */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          aria-describedby={bodyId}
          style={{ boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)" }}
          className={cn(
            "w-[calc(100%-2rem)] max-w-[560px] rounded-xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark p-6 sm:p-8",
            "transition-[opacity,transform] [transition-duration:var(--motion-medium)] [transition-timing-function:var(--ease-out)] motion-reduce:transition-none",
            open ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
          )}
        >
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

          {/* Playback + selection: the reciter line, transport (prev / play /
              next), and the multi-verse controls (range picker when nothing is
              selected; summary + capped chips + repeat stepper + loop toggle +
              gap presets + play-selection + clear once a selection exists). All
              lifted from PlaybackSurface; all command the one store + selection
              source, no second <audio>. */}
          {valid && (
            <section
              aria-label={t("player.selectionControls")}
              className="mt-5 space-y-3 border-t border-border pt-4"
            >
              <ReciterLine name={reciterName} />
              <TransportRow playing={playing} loading={loading} hasNext={hasNext} hasPrev={hasPrev} />
              <MultiVerseControls data={data} />
              {playerError && <ErrorLine error={playerError} />}
            </section>
          )}

          {/* Seam for the reciter compare, the per-verse note field, and the
              reading-depth section, mounted in the following step. The note
              control above scrolls here. */}
          <div ref={noteSeamRef} />
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(content, document.body) : null;
}
