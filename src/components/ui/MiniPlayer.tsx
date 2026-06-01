"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";

const SPEEDS = [0.75, 1, 1.25] as const;
const REPEAT_OPTIONS = [0, 2, 3, 5] as const;
const SLEEP_MINUTES = [5, 10, 15, 30] as const;

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
  const repeatOne = usePlayer((s) => s.repeatOne);
  const repeatRange = usePlayer((s) => s.repeatRange);
  const sleepEndOfSurah = usePlayer((s) => s.sleepEndOfSurah);
  const sleepActive = usePlayer((s) => s.sleepDeadline !== null);

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
        {showStudy && (
          <div className="mb-2 pb-2 border-b border-gold-light/20 dark:border-gold-dark/15 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
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

          <button
            type="button"
            onClick={() => setShowStudy((v) => !v)}
            aria-label={t("player.studyOptions")}
            aria-expanded={showStudy}
            title={t("player.studyOptions")}
            className={`p-2 min-w-[40px] min-h-[40px] rounded-lg ${
              showStudy || repeatOne > 0 || repeatRange || sleepEndOfSurah || sleepActive
                ? "text-primary dark:text-primary-light bg-primary/10 dark:bg-primary-light/20"
                : "text-text-muted hover:bg-bg-subtle"
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
