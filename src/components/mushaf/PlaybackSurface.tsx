"use client";

import { useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";
import { getRecitation } from "@/lib/reciters";
import { toArabicIndic, cn } from "@/lib/utils";
import { ArabicText } from "@/components/ui/ArabicText";
import { TajweedText } from "@/components/ui/TajweedText";
import type { MushafPageData } from "@/lib/types";

// The reader-scoped playback surface. It subscribes to the one zustand player
// store and commands it; it never owns audio (the single <audio> stays in
// PlayerHost). This plan ships the desktop side panel (>= 1024px). The bottom
// sheet for < 1024px is plan 04: it adds a matchMedia("(min-width: 1024px)")
// switch and renders the sheet branch in place of this panel below 1024px. For
// now the panel is gated behind `hidden lg:flex` so nothing shows below 1024px.

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

// Reused from the MiniPlayer: a calm three-dot pulse that signals the 100ms
// loading state on the play control, never a spinning busy glyph.
const LoadingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

// Chevrons point to the inner (reading) edge: collapse folds the panel toward
// the margin, expand opens it back over the reading column's reserved gutter.
const CollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

interface PlaybackSurfaceProps {
  // The page's verses, so the surface can find the tajweed markup for the
  // active verse and render it (read-only; never edits the verse text).
  data: MushafPageData;
}

export function PlaybackSurface({ data }: PlaybackSurfaceProps) {
  const { t, isAr } = useTranslation();
  // Collapsed-to-rail state is component session state only (not persisted to
  // storage in this plan). UI-SPEC allows in-session persistence; persisting
  // beyond mount would require a field in the consolidated storage sanitizer
  // (with export/import coverage), which is out of scope here. The store is
  // mounted once, so the surface itself persists across in-reader navigation;
  // only this collapsed boolean resets on a full remount.
  const [collapsed, setCollapsed] = useState(false);

  const status = usePlayer((s) => s.status);
  const cur = usePlayer((s) => s.queue[s.index] ?? null);
  const surahName = usePlayer((s) => s.surahName);
  const reciterId = usePlayer((s) => s.reciter);
  const hasNext = usePlayer((s) => s.index < s.queue.length - 1);
  const hasPrev = usePlayer((s) => s.index > 0);
  const error = usePlayer((s) => s.error);
  const loadToken = usePlayer((s) => s.loadToken);

  // The surface appears the instant a verse plays and folds away when the
  // player idles (stop). It is driven purely by store state, so audio started
  // on a prior page shows the surface immediately on mount too.
  const visible = cur !== null && status !== "idle";
  if (!visible || !cur) return null;

  const playing = status === "playing";
  const loading = status === "loading";
  const reciter = getRecitation(reciterId);
  const reciterName = reciter ? (isAr ? reciter.nameAr : reciter.nameEn) : reciterId;
  const refLabel = isAr ? `${toArabicIndic(cur.surah)}:${toArabicIndic(cur.ayah)}` : `${cur.surah}:${cur.ayah}`;

  // The tajweed markup for the active verse, looked up read-only from the page
  // data; if the active verse is not on this page (continuous play crossed a
  // page) the text simply omits rather than guessing.
  const activeVerse = data.verses.find((v) => v.surah === cur.surah && v.ayah === cur.ayah);

  // Try again re-issues a load for the current item by bumping loadToken (the
  // host re-fetches), clearing the error so the spinner replaces the message.
  const retry = () => {
    usePlayer.setState({ status: "loading", error: null, loadToken: loadToken + 1 });
  };

  const PlayPauseGlyph = loading ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />;
  const playPauseLabel = loading ? t("player.play") : playing ? t("player.pause") : t("player.play");

  return (
    // Docked on the content column's inner (reading-start) edge. At >= 1024px it
    // is part of the two-column layout, not an overlay, so it never covers the
    // active verse. `hidden lg:flex` keeps it out of the DOM below 1024px until
    // plan 04 adds the bottom-sheet branch and the matchMedia switch.
    <aside
      role="region"
      aria-label={t("player.play")}
      className={cn(
        // The inner border is the token-driven gold hairline (CSS var flips in
        // dark), matching the mushaf frame and the section-7 surface spec.
        "hidden lg:flex flex-col self-start sticky top-4 rounded-2xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark",
        // A 200ms slide/opacity reveal, dropped under reduced motion.
        "transition-[transform,opacity] duration-200 motion-reduce:transition-none",
        collapsed ? "w-[64px] p-2 items-center gap-3" : "w-[clamp(360px,28vw,400px)] p-6 gap-4",
      )}
      style={{ boxShadow: "0 8px 24px -16px rgba(16,20,32,0.30)" }}
    >
      {collapsed ? (
        // Rail: keep audio running, show only play state + a vertical truncated
        // reference + play/pause. Reopen restores the full panel.
        <>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label={t("player.expandPlayer")}
            title={t("player.expandPlayer")}
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
          >
            <ExpandIcon />
          </button>
          <button
            type="button"
            onClick={() => usePlayer.getState().toggle()}
            aria-label={playPauseLabel}
            title={playPauseLabel}
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 dark:bg-primary-light/20 text-primary dark:text-primary-light hover:bg-primary/20"
          >
            {PlayPauseGlyph}
          </button>
          <span
            className="text-micro tabular-nums text-text-muted [writing-mode:vertical-rl] max-h-24 truncate"
            aria-hidden="true"
          >
            {refLabel}
          </span>
        </>
      ) : (
        <>
          {/* (1) reference + surah name; the name truncates so the collapse
              control never gets pushed off the row. */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-body font-heading font-semibold text-text dark:text-text-dark truncate">
                {surahName ?? `${t("mushaf.juz")} ${isAr ? toArabicIndic(cur.surah) : cur.surah}`}
              </p>
              <p className="text-small tabular-nums text-text-muted">{refLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={t("player.collapsePlayer")}
              title={t("player.collapsePlayer")}
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 -me-2 -mt-2 rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
            >
              <CollapseIcon />
            </button>
          </div>

          {/* (2) verse text in Amiri Quran via the existing tajweed renderer
              (read-only markup). Falls back to nothing if the verse is off-page. */}
          {activeVerse && (
            <TajweedText
              tajweedHtml={activeVerse.tajweedHtml}
              className="!text-[1.25rem] !leading-[2.0]"
            />
          )}

          {/* (3) reciter name + a change affordance pointing at settings. */}
          <div className="flex items-center justify-between gap-2 text-small">
            <ArabicText
              text={reciterName}
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

          {/* (4) transport row at 44px targets. */}
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
              {PlayPauseGlyph}
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

          {/* (5) Multi-verse controls slot. Plan 05 fills this with the
              selection summary, repeat stepper, loop toggle, and inter-verse
              pause presets, plus (6) the clear-selection action. Kept as a
              labelled empty region so the layout rhythm is already in place. */}
          {/* PLAYBACK_SURFACE_MULTIVERSE_SLOT (plan 05) */}

          {/* Error: a single calm line with a retry and the reciter link. Red
              ochre appears here and nowhere else on the surface. */}
          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-small"
            >
              {/* Red ochre via the CSS var so it flips light/dark in one
                  declaration; this is the single accent-destructive use here. */}
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
          )}
        </>
      )}
    </aside>
  );
}
