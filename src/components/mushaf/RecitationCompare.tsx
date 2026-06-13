"use client";

import { useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useRecorder } from "@/hooks/useRecorder";
import { fetchAudioUrl } from "@/lib/audio-api";
import { usePlayer } from "@/hooks/usePlayer";
import type { ReciterId } from "@/lib/types";

interface RecitationCompareProps {
  surah: number;
  ayah: number;
  reciter: ReciterId;
}

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);
const MicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="21" />
  </svg>
);
const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

// Record-and-compare for the verse reading panel. The user records their own
// recitation (in memory only, via useRecorder) and replays it next to the
// reciter's audio to compare by ear. Nothing is uploaded, stored, or scored.
// Hidden entirely when the browser cannot record.
export function RecitationCompare({ surah, ayah, reciter }: RecitationCompareProps) {
  const { t } = useTranslation();
  const { supported, state, url, record, stop, reset } = useRecorder();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!supported) return null;

  const playClip = (src: string | null) => {
    if (!src) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    }
    audio.src = src;
    audio.play().catch(() => {});
  };

  const playReciter = async () => {
    try {
      const audioUrl = await fetchAudioUrl(surah, ayah, reciter);
      playClip(audioUrl);
    } catch {
      // No audio for this reciter/verse — nothing to play, no error surfaced.
    }
  };

  const startRecording = () => {
    // Pause the main verse player so the two don't overlap.
    const p = usePlayer.getState();
    if (p.status === "playing" || p.status === "loading") p.pause();
    audioRef.current?.pause();
    void record();
  };

  const pill = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium min-h-[36px] transition-colors motion-reduce:transition-none";

  return (
    <div className="rounded-lg border border-gold-light/30 dark:border-gold-dark/20 p-3">
      <h4 className="text-xs font-semibold text-text-muted">{t("compare.title")}</h4>
      <p className="text-[11px] text-text-muted mt-1">{t("compare.privacy")}</p>

      <div className="grid grid-cols-2 gap-3 mt-3">
        {/* Reciter side */}
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-[11px] text-text-muted">{t("compare.reciter")}</span>
          <button
            type="button"
            onClick={playReciter}
            aria-label={t("compare.playReciter")}
            className={`${pill} bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light hover:bg-primary/20`}
          >
            <PlayIcon />
            {t("compare.playReciter")}
          </button>
        </div>

        {/* Your take side */}
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-[11px] text-text-muted">{t("compare.yourTake")}</span>

          {state === "idle" && (
            <button type="button" onClick={startRecording} aria-label={t("compare.record")} className={`${pill} bg-accent/15 text-accent hover:bg-accent/25`}>
              <MicIcon />
              {t("compare.record")}
            </button>
          )}

          {state === "recording" && (
            <button type="button" onClick={stop} aria-label={t("compare.stop")} className={`${pill} bg-accent text-on-primary hover:bg-accent/90`}>
              <span className="w-2 h-2 rounded-full bg-on-primary animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              {t("compare.recording")}
            </button>
          )}

          {state === "ready" && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => playClip(url)} aria-label={t("compare.playYours")} className={`${pill} bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light hover:bg-primary/20`}>
                <PlayIcon />
                {t("compare.playYours")}
              </button>
              <button type="button" onClick={reset} aria-label={t("compare.rerecord")} className={`${pill} text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark`}>
                <MicIcon />
                {t("compare.rerecord")}
              </button>
            </div>
          )}

          {state === "denied" && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-accent">{t("compare.denied")}</p>
              <button type="button" onClick={startRecording} className={`${pill} bg-accent/15 text-accent hover:bg-accent/25`}>
                <MicIcon />
                {t("compare.tryAgain")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
