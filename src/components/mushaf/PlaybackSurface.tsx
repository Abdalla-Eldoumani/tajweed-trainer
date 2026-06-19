"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";
import { getRecitation } from "@/lib/reciters";
import { sheetBottomOffset, keyboardBottomOffset } from "@/lib/player-position";
import { toArabicIndic, cn } from "@/lib/utils";
import { ArabicText } from "@/components/ui/ArabicText";
import { TajweedText } from "@/components/ui/TajweedText";
import type { MushafPageData } from "@/lib/types";

// The reader-scoped playback surface. It subscribes to the one zustand player
// store and commands it; it never owns audio (the single <audio> stays in
// PlayerHost). It has two presentations off the same store state and the same
// shared sub-parts: a desktop side panel (>= 1024px) and a bottom sheet
// (< 1024px). A single reactive matchMedia("(min-width: 1024px)") boundary
// chooses which one renders, so there is never both in the DOM at once. The
// 1024 (lg) switch is intentionally distinct from the 768 (md) tab-bar boundary
// the sheet uses for its reserved-bottom math.

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

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// A live snapshot of the store fields both presentations render, plus the
// derived labels. Computed once in the parent and passed into the panel/sheet so
// the two presentations never drift and never re-subscribe twice.
interface SurfaceModel {
  cur: { surah: number; ayah: number };
  surahName: string | null;
  reciterName: string;
  refLabel: string;
  playing: boolean;
  loading: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  error: string | null;
  tajweedHtml: string | null;
  playPauseGlyph: React.ReactNode;
  playPauseLabel: string;
}

// --- Shared sub-parts (identical in the panel and the sheet) -----------------

// (3) reciter name + a change affordance pointing at settings.
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

// (4) transport row at 44px targets. Commands store actions only.
function TransportRow({ model }: { model: SurfaceModel }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => usePlayer.getState().prev()}
        disabled={!model.hasPrev}
        aria-label={t("player.previous")}
        className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted disabled:opacity-40 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
      >
        <PrevIcon />
      </button>
      <button
        type="button"
        onClick={() => usePlayer.getState().toggle()}
        aria-label={model.playPauseLabel}
        title={model.playPauseLabel}
        className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 dark:bg-primary-light/20 text-primary dark:text-primary-light hover:bg-primary/20"
      >
        {model.playPauseGlyph}
      </button>
      <button
        type="button"
        onClick={() => usePlayer.getState().next()}
        disabled={!model.hasNext}
        aria-label={t("player.next")}
        className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted disabled:opacity-40 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
      >
        <NextIcon />
      </button>
    </div>
  );
}

// (6) Error: a single calm line with a retry and the reciter link. Red ochre
// appears here and nowhere else on the surface. Try again re-issues a load for
// the current item by bumping loadToken (the host re-fetches), clearing the
// error so the loading glyph replaces the message.
function ErrorLine({ error }: { error: string }) {
  const { t } = useTranslation();
  const retry = () => {
    const s = usePlayer.getState();
    usePlayer.setState({ status: "loading", error: null, loadToken: s.loadToken + 1 });
  };
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-small"
    >
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

// --- Desktop side panel (>= 1024px) ------------------------------------------

function SidePanel({ model }: { model: SurfaceModel }) {
  const { t, isAr } = useTranslation();
  // Collapsed-to-rail state is component session state only (not persisted to
  // storage in this plan). The store is mounted once, so the surface itself
  // persists across in-reader navigation; only this collapsed boolean resets on
  // a full remount.
  const [collapsed, setCollapsed] = useState(false);

  return (
    // Docked on the content column's inner (reading-start) edge. It is part of
    // the two-column layout, not an overlay, so it never covers the active verse.
    <aside
      role="region"
      aria-label={t("player.play")}
      className={cn(
        // The inner border is the token-driven gold hairline (CSS var flips in
        // dark), matching the mushaf frame and the section-7 surface spec.
        "flex flex-col self-start sticky top-4 rounded-2xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark",
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
            aria-label={model.playPauseLabel}
            title={model.playPauseLabel}
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 dark:bg-primary-light/20 text-primary dark:text-primary-light hover:bg-primary/20"
          >
            {model.playPauseGlyph}
          </button>
          <span
            className="text-micro tabular-nums text-text-muted [writing-mode:vertical-rl] max-h-24 truncate"
            aria-hidden="true"
          >
            {model.refLabel}
          </span>
        </>
      ) : (
        <>
          {/* (1) reference + surah name; the name truncates so the collapse
              control never gets pushed off the row. */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-body font-heading font-semibold text-text dark:text-text-dark truncate">
                {model.surahName ?? `${t("mushaf.juz")} ${isAr ? toArabicIndic(model.cur.surah) : model.cur.surah}`}
              </p>
              <p className="text-small tabular-nums text-text-muted">{model.refLabel}</p>
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
          {model.tajweedHtml && (
            <TajweedText
              tajweedHtml={model.tajweedHtml}
              className="!text-[1.25rem] !leading-[2.0]"
            />
          )}

          <ReciterLine name={model.reciterName} />
          <TransportRow model={model} />

          {/* (5) Multi-verse controls slot. Plan 05 fills this with the
              selection summary, repeat stepper, loop toggle, and inter-verse
              pause presets, plus (6) the clear-selection action. Kept as a
              labelled empty region so the layout rhythm is already in place. */}
          {/* PLAYBACK_SURFACE_MULTIVERSE_SLOT (plan 05) */}

          {model.error && <ErrorLine error={model.error} />}
        </>
      )}
    </aside>
  );
}

// --- Mobile / tablet bottom sheet (< 1024px) ---------------------------------

// Past this many pixels of downward drag on the grab handle, a release closes
// the sheet (otherwise a small movement is treated as a tap that toggles the
// height). An upward drag from peek expands.
const SWIPE_CLOSE_THRESHOLD = 64;

function BottomSheet({ model }: { model: SurfaceModel }) {
  const { t, isAr } = useTranslation();
  // The sheet height: peek shows one transport row (within 100ms of the tap),
  // expanded adds the verse text and the multi-verse controls. It opens in peek.
  const [sheetState, setSheetState] = useState<"peek" | "expanded">("peek");
  const expanded = sheetState === "expanded";

  const panelRef = useRef<HTMLDivElement>(null);
  // The control focused when the sheet first opened, so focus returns there on
  // close instead of being lost to the top of the page.
  const openerRef = useRef<HTMLElement | null>(null);
  // Pointer-drag bookkeeping for the grab handle (start Y + whether moved).
  const dragRef = useRef<{ startY: number; delta: number } | null>(null);

  const close = useCallback(() => {
    // Dismiss folds the surface away. Stop idles the player (status "idle"), so
    // the store-driven `visible` gate in the parent unmounts the sheet, exactly
    // like the panel. Closing is the one explicit end of playback on the sheet.
    usePlayer.getState().stop();
  }, []);

  // The sheet's bottom offset in CSS pixels. It reserves the tab-bar strip only
  // in peek below 768px (reservedBottomFor via sheetBottomOffset); when the
  // keyboard is open it instead rides the visual viewport so it stays above the
  // keyboard inset. Re-clamped on resize/orientationchange so rotation never
  // leaves it off-screen or half-covered. The safe-area inset is handled by the
  // `.safe-bottom` padding at every width, independent of this offset.
  const [bottomOffset, setBottomOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    const recompute = () => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      // When the visual viewport is shorter than the layout viewport a keyboard
      // (or URL bar) is eating space; lift the sheet to its bottom edge.
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
  }, [expanded]);

  // Capture the opener once when the sheet mounts (it mounts the instant a verse
  // plays); restore focus to it when the sheet unmounts on close.
  useEffect(() => {
    openerRef.current = (document.activeElement as HTMLElement) ?? null;
    return () => {
      openerRef.current?.focus?.();
    };
  }, []);

  // Escape dismisses the sheet at any height (peek or expanded).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Focus-trap ONLY while expanded: focus cannot leave to the page behind. In
  // peek the page stays usable (no trap), so the tab bar and verses stay
  // reachable. Mirrors the MobileDrawer trap.
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!expanded || e.key !== "Tab") return;
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

  // When the sheet expands, move focus into it (to the dismiss control) so the
  // trap has somewhere to keep focus and a screen-reader user lands inside.
  const dismissRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (expanded) dismissRef.current?.focus();
  }, [expanded]);

  // Grab-handle drag: down past the threshold closes; up from peek expands; a
  // small movement is a tap that toggles peek<->expanded.
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
      close();
    } else if (drag.delta < -SWIPE_CLOSE_THRESHOLD) {
      setSheetState("expanded");
    } else {
      // A tap toggles the height.
      setSheetState((s) => (s === "peek" ? "expanded" : "peek"));
    }
  };

  return (
    <div
      ref={panelRef}
      onKeyDown={trapTab}
      role={expanded ? "dialog" : "region"}
      aria-modal={expanded ? true : undefined}
      aria-label={t("player.play")}
      className={cn(
        // Fixed to the bottom, full width, top corners rounded. --bg-card ground
        // with the section-7 gold hairline above it; the safe-area inset is
        // reserved by .safe-bottom at every width. The `bottom` offset (tab-bar
        // reserve in peek below 768px, or the keyboard lift) is applied inline.
        "fixed inset-x-0 z-40 flex flex-col rounded-t-2xl border-t border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark safe-bottom",
        // A 200ms transform-and-fade rise, dropped under reduced motion.
        "transition-transform duration-200 motion-reduce:transition-none",
      )}
      style={{ bottom: bottomOffset, boxShadow: "0 -8px 32px -16px rgba(16,20,32,0.40)" }}
    >
      {/* Grab handle: a centered 36x4px bar inside a >= 44px-tall hit target.
          Tap toggles peek/expanded; swipe down closes; swipe up expands. */}
      <button
        type="button"
        aria-label={t("player.grabHandle")}
        aria-expanded={expanded}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        className="flex items-center justify-center w-full h-11 touch-none"
      >
        {/* 36x4px bar in --text-muted at low opacity (the CSS var flips
            light/dark; opacity is applied inline since Tailwind alpha modifiers
            do not compose over an arbitrary CSS-var color). */}
        <span
          className="block w-9 h-1 rounded-full"
          style={{ backgroundColor: "var(--text-muted)", opacity: 0.4 }}
          aria-hidden="true"
        />
      </button>

      {/* Peek row: reference + surah name, a play state, transport (prev / play
          / next). Always present, so a first-time small-screen user sees their
          tap worked within 100ms. */}
      <div className="flex items-center gap-3 px-4 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-small font-heading font-semibold text-text dark:text-text-dark truncate">
            {model.surahName ?? `${t("mushaf.juz")} ${isAr ? toArabicIndic(model.cur.surah) : model.cur.surah}`}
          </p>
          <p className="text-micro tabular-nums text-text-muted">{model.refLabel}</p>
        </div>
        <TransportRow model={model} />
        <button
          ref={dismissRef}
          type="button"
          onClick={close}
          aria-label={t("player.closePlayer")}
          title={t("player.closePlayer")}
          className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Expanded extras: the verse text in Amiri Quran, the reciter line, the
          multi-verse slot, and the error line. Rendered only when expanded; the
          peek state stays a single compact row above the tab bar. */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {model.tajweedHtml && (
            <TajweedText
              tajweedHtml={model.tajweedHtml}
              className="!text-[1.25rem] !leading-[2.0]"
            />
          )}
          <ReciterLine name={model.reciterName} />

          {/* (5) Multi-verse controls slot, shared with the panel. Plan 05 fills
              it with the selection summary, repeat stepper, loop toggle, and
              inter-verse pause presets, plus the clear-selection action. */}
          {/* PLAYBACK_SURFACE_MULTIVERSE_SLOT (plan 05) */}

          {model.error && <ErrorLine error={model.error} />}
        </div>
      )}
    </div>
  );
}

interface PlaybackSurfaceProps {
  // The page's verses, so the surface can find the tajweed markup for the
  // active verse and render it (read-only; never edits the verse text).
  data: MushafPageData;
}

export function PlaybackSurface({ data }: PlaybackSurfaceProps) {
  const { t, isAr } = useTranslation();

  // ONE reactive boundary chooses panel vs sheet so only one renders. Resolved
  // post-mount behind a tri-state (null until measured) so SSR/first paint emit
  // nothing surface-specific and hydration always agrees; a resize across 1024
  // swaps presentations live with no reload and no double surface (EDGE_CASES
  // A5). The 1024 (lg) boundary is intentionally distinct from the 768 (md)
  // tab-bar boundary the sheet uses for its reserved-bottom math.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const status = usePlayer((s) => s.status);
  const cur = usePlayer((s) => s.queue[s.index] ?? null);
  const surahName = usePlayer((s) => s.surahName);
  const reciterId = usePlayer((s) => s.reciter);
  const hasNext = usePlayer((s) => s.index < s.queue.length - 1);
  const hasPrev = usePlayer((s) => s.index > 0);
  const error = usePlayer((s) => s.error);

  // The surface appears the instant a verse plays and folds away when the
  // player idles (stop). It is driven purely by store state, so audio started
  // on a prior page shows the surface immediately on mount too.
  const visible = cur !== null && status !== "idle";
  // Render nothing surface-specific until the breakpoint resolves, so the first
  // client paint matches the (empty) server paint and never flashes both.
  if (!visible || !cur || isDesktop === null) return null;

  const playing = status === "playing";
  const loading = status === "loading";
  const reciter = getRecitation(reciterId);
  const reciterName = reciter ? (isAr ? reciter.nameAr : reciter.nameEn) : reciterId;
  const refLabel = isAr ? `${toArabicIndic(cur.surah)}:${toArabicIndic(cur.ayah)}` : `${cur.surah}:${cur.ayah}`;

  // The tajweed markup for the active verse, looked up read-only from the page
  // data; if the active verse is not on this page (continuous play crossed a
  // page) the text simply omits rather than guessing.
  const activeVerse = data.verses.find((v) => v.surah === cur.surah && v.ayah === cur.ayah);

  const playPauseGlyph = loading ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />;
  // Loading and stopped both read as "play" intent; only an actively playing
  // verse shows the pause label. Resolved once here for both presentations.
  const playPauseLabel = playing ? t("player.pause") : t("player.play");

  const model: SurfaceModel = {
    cur,
    surahName,
    reciterName,
    refLabel,
    playing,
    loading,
    hasNext,
    hasPrev,
    error,
    tajweedHtml: activeVerse?.tajweedHtml ?? null,
    playPauseGlyph,
    playPauseLabel,
  };

  // Exactly one presentation is in the DOM: the side panel at >= 1024px, the
  // bottom sheet below it. Never both (no double surface at 1024).
  return isDesktop ? <SidePanel model={model} /> : <BottomSheet model={model} />;
}
