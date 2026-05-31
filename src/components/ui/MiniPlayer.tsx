"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";

const SPEEDS = [0.75, 1, 1.25] as const;

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Persistent transport bar shown whenever something is queued. Mounted once in
// AppProvider so it stays put across route changes.
export function MiniPlayer() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  const visible = mounted && queueLen > 0 && status !== "idle" && cur !== null;
  const playing = status === "playing";
  const label = surahName ?? (cur ? `Surah ${cur.surah}` : "");

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-16 md:bottom-0 z-40 transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div
        className="mx-auto max-w-4xl m-2 rounded-xl border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark px-3 py-2 safe-bottom"
        style={{ boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)" }}
        role="region"
        aria-label={t("player.play")}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => usePlayer.getState().prev()}
            disabled={!hasPrev}
            aria-label={t("player.previous")}
            className="p-2 min-w-[40px] min-h-[40px] rounded-lg disabled:opacity-40 hover:bg-bg-subtle"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => usePlayer.getState().toggle()}
            aria-label={playing ? t("player.pause") : t("player.play")}
            className="p-2 min-w-[44px] min-h-[44px] rounded-lg bg-primary/10 dark:bg-primary-light/20 hover:bg-primary/20"
          >
            {status === "loading" ? "…" : playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            onClick={() => usePlayer.getState().next()}
            disabled={!hasNext}
            aria-label={t("player.next")}
            className="p-2 min-w-[40px] min-h-[40px] rounded-lg disabled:opacity-40 hover:bg-bg-subtle"
          >
            ⏭
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
              <span className="truncate">
                {label}
                {cur ? ` · ${cur.surah}:${cur.ayah}` : ""}
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide">
                {mode === "continuous" ? t("player.modeContinuous") : t("player.modeSingle")}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Number.isFinite(duration) && duration > 0 ? duration : 0}
              step={0.1}
              value={Math.min(currentTime, duration || currentTime)}
              onChange={(e) => usePlayer.getState().seek(Number(e.target.value))}
              aria-label={t("player.seek")}
              className="w-full accent-primary"
            />
            <div className="flex items-center justify-between text-[10px] text-text-muted tabular-nums">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <select
            value={speed}
            onChange={(e) => usePlayer.getState().setSpeed(Number(e.target.value))}
            aria-label={t("player.speed")}
            className="text-xs rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark px-1.5 py-1"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => usePlayer.getState().stop()}
            aria-label={t("player.close")}
            className="p-2 min-w-[40px] min-h-[40px] rounded-lg hover:bg-bg-subtle"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
