"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";
import { ayahCountForSurah } from "@/lib/navigation";
import { getPlayerPosition, setPlayerPosition, getPlayerMinimized, setPlayerMinimized } from "@/lib/storage";
import {
  clampPlayerPosition,
  reservedBottomFor,
  KEYBOARD_STEP,
  type PlayerPosition,
  type PlayerSize,
  type Viewport,
} from "@/lib/player-position";

const SPEEDS = [0.75, 1, 1.25] as const;
const REPEAT_OPTIONS = [0, 2, 3, 5] as const;
const SLEEP_MINUTES = [5, 10, 15, 30] as const;

// Margin from the viewport edge for the default dock, so the card never sits
// flush against the screen border.
const DOCK_MARGIN = 8;

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// The default docked top-left: horizontally centered, sitting just above the
// reserved bottom strip (the mobile tab bar) like the original docked bar. Pure
// arithmetic against a measured viewport and player box; the caller clamps the
// result so it is always on-screen.
function defaultDock(viewport: Viewport, player: PlayerSize): PlayerPosition {
  const reserved = reservedBottomFor(viewport);
  return {
    x: Math.round((viewport.width - player.width) / 2),
    y: Math.round(viewport.height - player.height - reserved - DOCK_MARGIN),
  };
}

const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);

const PrevIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 5h2v14H6z" />
    <path d="M18 5v14L9 12z" />
  </svg>
);

const NextIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 5h2v14h-2z" />
    <path d="M6 5v14l9-7z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 5h3.5v14H7z" />
    <path d="M13.5 5H17v14h-3.5z" />
  </svg>
);

const LoadingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ExpandIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 15 12 9 18 15" />
  </svg>
);

const SlidersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

// Persistent transport bar shown whenever something is queued. Mounted once in
// AppProvider so it stays put across route changes. The expandable study panel
// holds the repeat and sleep-timer controls (study tools).
export function MiniPlayer() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [showStudy, setShowStudy] = useState(false);
  // Collapsed pill state. Minimizing keeps playback and the drag handle; only
  // the explicit stop control dismisses the player. Restored after mount (the
  // server render shows nothing) and persisted so it survives navigation.
  const [minimized, setMinimized] = useState(false);
  useEffect(() => {
    setMounted(true);
    setMinimized(getPlayerMinimized());
  }, []);

  const toggleMinimized = () => {
    // Persist beside the setState call, not inside the updater: StrictMode
    // double-invokes updaters, and the storage write must not run mid-render.
    const next = !minimized;
    setMinimized(next);
    setPlayerMinimized(next);
  };

  const status = usePlayer((s) => s.status);
  const cur = usePlayer((s) => s.queue[s.index] ?? null);
  const surahName = usePlayer((s) => s.surahName);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const speed = usePlayer((s) => s.speed);
  const mode = usePlayer((s) => s.mode);
  const hasNext = usePlayer((s) => s.index < s.queue.length - 1);
  const hasPrev = usePlayer((s) => s.index > 0);
  const queueLen = usePlayer((s) => s.queue.length);
  const repeatOne = usePlayer((s) => s.repeatOne);
  const repeatRange = usePlayer((s) => s.repeatRange);
  const sleepEndOfSurah = usePlayer((s) => s.sleepEndOfSurah);
  const sleepActive = usePlayer((s) => s.sleepDeadline !== null);
  const error = usePlayer((s) => s.error);

  // Range inputs are local; the store owns the active range once "Loop" is hit.
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(7);
  const [count, setCount] = useState(2);
  // The sleep <select> value is local because the store holds an absolute
  // deadline, which doesn't map back to the chosen minutes.
  const [sleepSel, setSleepSel] = useState("");

  const visible = mounted && queueLen > 0 && status !== "idle" && cur !== null;
  const playing = status === "playing";
  const label = surahName ?? (cur ? `Surah ${cur.surah}` : "");
  const canRange = mode === "continuous" && queueLen > 1;
  const maxAyah = Math.max(1, queueLen);

  const onSleepChange = (value: string) => {
    setSleepSel(value);
    if (value === "surah") usePlayer.getState().setSleepEndOfSurah(true);
    else if (value === "") {
      usePlayer.getState().setSleepTimer(null);
      usePlayer.getState().setSleepEndOfSurah(false);
    } else usePlayer.getState().setSleepTimer(Number(value));
  };

  // --- Movable player -------------------------------------------------------
  // The card is positioned by a fixed top-left corner driven from state and
  // applied as a transform, never by remounting: the single <audio> lives in
  // PlayerHost, a sibling mounted once in AppProvider, so moving this DOM never
  // touches playback. null means "use the computed default dock"; we resolve it
  // to a concrete point on mount once the box can be measured.
  const cardRef = useRef<HTMLDivElement | null>(null);
  // The study-options toggle, so Escape inside the expanded panel can collapse
  // it and hand focus back to the control that opened it.
  const studyToggleRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<PlayerPosition | null>(null);
  // Mirror of pos for the resize listener and the re-clamp effect, so they can
  // read the latest position without re-subscribing on every move and without
  // a functional updater (persisting from inside one is a render-phase side
  // effect that StrictMode double-fires).
  const posRef = useRef<PlayerPosition | null>(null);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  // True only while a pointer drag is in flight; used to suppress the position
  // transition so the 1:1 follow has no easing (the spec's hard requirement).
  const [dragging, setDragging] = useState(false);
  // Pointer-down offset between the grab point and the card's top-left, so the
  // card does not jump under the cursor when the drag starts.
  const grabOffset = useRef({ dx: 0, dy: 0 });

  const measure = useCallback((): PlayerSize => {
    const el = cardRef.current;
    return el
      ? { width: el.offsetWidth, height: el.offsetHeight }
      : { width: 0, height: 0 };
  }, []);

  const viewport = useCallback(
    (): Viewport => ({ width: window.innerWidth, height: window.innerHeight }),
    [],
  );

  // Resolve and clamp a candidate position to the live viewport, persist it, and
  // apply it. Every path (mount restore, drag, resize, keyboard) funnels through
  // here so nothing can land off-screen or skip persistence.
  // Visual follow during a drag: clamp and render only. Persisting here would
  // serialize the whole progress object and notify every useProgress consumer
  // at pointer-move frequency, usually while audio is playing. posRef is
  // written synchronously so endDrag can persist the final point even before
  // the mirroring effect has run.
  const move = useCallback(
    (next: PlayerPosition) => {
      const clamped = clampPlayerPosition(next, viewport(), measure());
      posRef.current = clamped;
      setPos(clamped);
    },
    [measure, viewport],
  );

  const commit = useCallback(
    (next: PlayerPosition) => {
      const clamped = clampPlayerPosition(next, viewport(), measure());
      posRef.current = clamped;
      setPos(clamped);
      setPlayerPosition(clamped);
    },
    [measure, viewport],
  );

  // On mount, restore the stored corner (or fall back to the default dock) and
  // clamp it to the current viewport, so a value saved on a larger screen can
  // never strand the card off-screen. Runs after `mounted` so the box has laid
  // out and window is available.
  useEffect(() => {
    if (!mounted) return;
    const size = measure();
    const vp = viewport();
    const stored = getPlayerPosition();
    const start = stored ?? defaultDock(vp, size);
    setPos(clampPlayerPosition(start, vp, size));
    // Intentionally run once after mount; commit/measure are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Re-clamp on resize and orientation change (and the mobile URL-bar show/hide
  // that resizes the visual viewport) so the card stays fully on-screen and
  // clear of the bottom nav as the available space changes.
  useEffect(() => {
    if (!mounted) return;
    const onResize = () => {
      commit(posRef.current ?? defaultDock(viewport(), measure()));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [mounted, commit, measure, viewport]);

  // Collapsing to the pill (or expanding back) changes the card's size, so the
  // stored corner may now hang off-screen; re-clamp and persist only when the
  // position actually moved.
  useEffect(() => {
    if (!mounted) return;
    const prev = posRef.current;
    if (prev === null) return;
    const clamped = clampPlayerPosition(prev, viewport(), measure());
    if (clamped.x === prev.x && clamped.y === prev.y) return;
    setPos(clamped);
    setPlayerPosition(clamped);
  }, [minimized, mounted, measure, viewport]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only react to the primary button / a touch or pen contact.
    if (e.button !== 0) return;
    const current = pos ?? defaultDock(viewport(), measure());
    grabOffset.current = { dx: e.clientX - current.x, dy: e.clientY - current.y };
    // Capture so a drag that leaves the handle still tracks (mouse, touch, pen).
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    // Follow the pointer 1:1; clamp keeps it on-screen every frame.
    move({ x: e.clientX - grabOffset.current.dx, y: e.clientY - grabOffset.current.dy });
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // Persist once at release; moves only render. The stored value is the
    // final clamped corner of the drag.
    if (posRef.current) setPlayerPosition(posRef.current);
  };

  const onHandleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const base = pos ?? defaultDock(viewport(), measure());
    let { x, y } = base;
    switch (e.key) {
      case "ArrowLeft": x -= KEYBOARD_STEP; break;
      case "ArrowRight": x += KEYBOARD_STEP; break;
      case "ArrowUp": y -= KEYBOARD_STEP; break;
      case "ArrowDown": y += KEYBOARD_STEP; break;
      default: return;
    }
    // Arrow keys move the card, not the page; stop the default scroll.
    e.preventDefault();
    commit({ x, y });
  };

  return (
    // Full-viewport positioning layer that never blocks clicks; the card inside
    // re-enables pointer events and is placed by a transform from the top-left.
    // `inert` while hidden removes the still-mounted transport controls from the
    // tab order and the accessibility tree (aria-hidden alone left them
    // focusable — the aria-hidden-focus violation).
    <div inert={!visible} aria-hidden={!visible} className="pointer-events-none fixed inset-0 z-40">
      <div
        ref={cardRef}
        // Anchor to the physical left edge (not logical `start`): the drag math
        // is in physical pixels (clientX, innerWidth), so the x-translate origin
        // must be the left edge in both LTR and RTL or it would flip off-screen.
        className={`pointer-events-auto fixed left-0 top-0 rounded-xl border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark ${
          minimized ? "w-auto max-w-[260px] px-1.5 py-1" : "w-[calc(100%-1rem)] max-w-4xl px-3 py-2 safe-bottom"
        } ${
          // No transition while dragging (1:1 follow) and none under reduced
          // motion; otherwise a short settle on programmatic / keyboard moves.
          dragging ? "" : "transition-transform duration-150 motion-reduce:transition-none"
        } ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{
          boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)",
          // Before the mount measurement resolves a position, keep the card off
          // the initial paint (it matches the server render: nothing visible),
          // then the transform applies once pos is known.
          transform: pos ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : "translate3d(-9999px, 0, 0)",
          touchAction: "none",
        }}
        role="region"
        aria-label={t("player.play")}
      >
        {!minimized && error && (
          <div
            role="alert"
            className="mb-2 pb-2 border-b border-gold-light/20 dark:border-gold-dark/15 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs"
          >
            <span className="text-red-600 dark:text-red-400">{t(error)}</span>
            <Link
              href="/settings"
              className="shrink-0 font-medium text-primary dark:text-primary-light underline underline-offset-2 hover:no-underline"
            >
              {t("audio.changeReciter")}
            </Link>
          </div>
        )}

        {!minimized && showStudy && (
          <div
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowStudy(false);
                studyToggleRef.current?.focus();
              }
            }}
            className="mb-2 pb-2 border-b border-gold-light/20 dark:border-gold-dark/15 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
          >
            <label className="flex items-center gap-1.5">
              <span className="text-text-muted">{t("player.repeatVerse")}</span>
              <select
                value={REPEAT_OPTIONS.includes(repeatOne as 0 | 2 | 3 | 5) ? repeatOne : 0}
                onChange={(e) => usePlayer.getState().setRepeatOne(Number(e.target.value))}
                aria-label={t("player.repeatVerse")}
                className="rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark px-1.5 py-1"
              >
                {REPEAT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? t("player.off") : `${t("player.times")}${n}`}
                  </option>
                ))}
              </select>
            </label>

            {canRange && (
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">{t("player.loopRange")}</span>
                <input
                  type="number" min={1} max={maxAyah} value={from}
                  onChange={(e) => setFrom(Number(e.target.value))}
                  aria-label={t("player.rangeFrom")}
                  className="w-12 rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark px-1.5 py-1"
                />
                <span className="text-text-muted">–</span>
                <input
                  type="number" min={1} max={maxAyah} value={to}
                  onChange={(e) => setTo(Number(e.target.value))}
                  aria-label={t("player.rangeTo")}
                  className="w-12 rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark px-1.5 py-1"
                />
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  aria-label={t("player.times")}
                  className="rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark px-1.5 py-1"
                >
                  {[2, 3, 5, 10].map((n) => (
                    <option key={n} value={n}>{`${t("player.times")}${n}`}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => usePlayer.getState().setRepeatRange(from, to, count)}
                  className={`rounded-lg px-2 py-1 min-h-[32px] ${repeatRange ? "bg-primary text-white" : "bg-primary/10 dark:bg-primary-light/20 text-primary dark:text-primary-light hover:bg-primary/20"}`}
                >
                  {t("player.loopStart")}
                </button>
              </div>
            )}

            <label className="flex items-center gap-1.5">
              <span className="text-text-muted">{t("player.sleep")}</span>
              <select
                value={sleepEndOfSurah ? "surah" : sleepActive ? sleepSel || "" : ""}
                onChange={(e) => onSleepChange(e.target.value)}
                aria-label={t("player.sleep")}
                className="rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark px-1.5 py-1"
              >
                <option value="">{t("player.off")}</option>
                {SLEEP_MINUTES.map((m) => (
                  <option key={m} value={m}>{`${m} ${t("player.min")}`}</option>
                ))}
                <option value="surah">{t("player.sleepEndOfSurah")}</option>
              </select>
            </label>
          </div>
        )}

        {/* The drag handle appears in both layouts with the same pointer and
            keyboard wiring, so muscle memory carries across minimize. */}
        {minimized ? (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onHandleKeyDown}
              aria-label={t("player.dragHandle")}
              title={t("player.dragHandle")}
              className="touch-none cursor-grab active:cursor-grabbing p-2 min-w-[40px] min-h-[40px] rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              <GripIcon />
            </button>
            <button
              type="button"
              onClick={() => usePlayer.getState().toggle()}
              aria-label={playing ? t("player.pause") : t("player.play")}
              className="p-2 min-w-[40px] min-h-[40px] rounded-lg bg-primary/10 dark:bg-primary-light/20 hover:bg-primary/20 inline-flex items-center justify-center"
            >
              {status === "loading" ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <span
              className={`max-w-[120px] truncate text-xs px-1 ${error ? "text-red-600 dark:text-red-400" : "text-text-muted"}`}
            >
              {label}
              {cur ? ` · ${cur.surah}:${cur.ayah}` : ""}
            </span>
            <button
              type="button"
              onClick={toggleMinimized}
              aria-label={t("player.expand")}
              title={t("player.expand")}
              className="p-2 min-w-[40px] min-h-[40px] rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark inline-flex items-center justify-center"
            >
              <ExpandIcon />
            </button>
          </div>
        ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            // Dedicated grab affordance. Pointer events drive the drag; arrow
            // keys nudge it when focused. Kept out of the transport tab flow's
            // way: it is just one more focusable control, never a focus trap.
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onHandleKeyDown}
            aria-label={t("player.dragHandle")}
            title={t("player.dragHandle")}
            className="touch-none cursor-grab active:cursor-grabbing p-2 min-w-[40px] min-h-[40px] rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            <GripIcon />
          </button>
          <button
            type="button"
            onClick={() => usePlayer.getState().prev()}
            disabled={!hasPrev}
            aria-label={t("player.previous")}
            className="p-2 min-w-[40px] min-h-[40px] rounded-lg disabled:opacity-40 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark inline-flex items-center justify-center"
          >
            <PrevIcon />
          </button>
          <button
            type="button"
            onClick={() => usePlayer.getState().toggle()}
            aria-label={playing ? t("player.pause") : t("player.play")}
            className="p-2 min-w-[44px] min-h-[44px] rounded-lg bg-primary/10 dark:bg-primary-light/20 hover:bg-primary/20 inline-flex items-center justify-center"
          >
            {status === "loading" ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            onClick={() => usePlayer.getState().next()}
            disabled={!hasNext}
            aria-label={t("player.next")}
            className="p-2 min-w-[40px] min-h-[40px] rounded-lg disabled:opacity-40 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark inline-flex items-center justify-center"
          >
            <NextIcon />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
              <span className="truncate">
                {label}
                {cur ? ` · ${cur.surah}:${cur.ayah}` : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!cur) return;
                  if (mode === "continuous") usePlayer.getState().setMode("single");
                  else usePlayer.getState().setMode("continuous", ayahCountForSurah(cur.surah));
                }}
                aria-label={mode === "continuous" ? t("player.modeToSingle") : t("player.modeToContinuous")}
                title={mode === "continuous" ? t("player.modeToSingle") : t("player.modeToContinuous")}
                className="shrink-0 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 text-primary dark:text-primary-light hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
              >
                {mode === "continuous" ? t("player.modeContinuous") : t("player.modeSingle")}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={Number.isFinite(duration) && duration > 0 ? duration : 0}
              step={0.1}
              // Keep the thumb value within max: before metadata loads, duration
              // is 0, so the value pins to 0 instead of jumping past a 0 max.
              value={Number.isFinite(duration) && duration > 0 ? Math.min(currentTime, duration) : 0}
              onChange={(e) => usePlayer.getState().seek(Number(e.target.value))}
              aria-label={t("player.seek")}
              className="w-full accent-primary"
            />
            <div className="flex items-center justify-between text-[10px] text-text-muted tabular-nums">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <button
            ref={studyToggleRef}
            type="button"
            onClick={() => setShowStudy((v) => !v)}
            aria-label={t("player.studyOptions")}
            aria-expanded={showStudy}
            title={t("player.studyOptions")}
            className={`p-2 min-w-[40px] min-h-[40px] rounded-lg ${
              showStudy || repeatOne > 0 || repeatRange || sleepEndOfSurah || sleepActive
                ? "text-primary dark:text-primary-light bg-primary/10 dark:bg-primary-light/20"
                : "text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
            }`}
          >
            <SlidersIcon />
          </button>
          <select
            value={speed}
            onChange={(e) => usePlayer.getState().setSpeed(Number(e.target.value))}
            aria-label={t("player.speed")}
            className="text-xs rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark px-1.5 py-1"
          >
            {SPEEDS.map((sp) => (
              <option key={sp} value={sp}>
                {sp}×
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleMinimized}
            aria-label={t("player.minimize")}
            title={t("player.minimize")}
            className="p-2 min-w-[40px] min-h-[40px] rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark inline-flex items-center justify-center"
          >
            <MinimizeIcon />
          </button>
          <button
            type="button"
            onClick={() => usePlayer.getState().stop()}
            aria-label={t("player.close")}
            title={t("player.close")}
            className="p-2 min-w-[40px] min-h-[40px] rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark inline-flex items-center justify-center"
          >
            <CloseIcon />
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
