"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic, cn } from "@/lib/utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useMemorization } from "@/hooks/useMemorization";
import { TajweedText } from "@/components/ui/TajweedText";
import type { MushafPageData, SurahHeader } from "@/lib/types";

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

          {/* Seam for the per-verse note field, reciter compare, range
              selection, repeat/loop/gap, and reading depth, lifted in following
              steps. The note control above scrolls here. */}
          <div ref={noteSeamRef} />
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(content, document.body) : null;
}
