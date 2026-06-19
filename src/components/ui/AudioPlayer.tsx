"use client";

import { usePlayer } from "@/hooks/usePlayer";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ReciterId } from "@/lib/types";

interface AudioPlayerProps {
  surah: number;
  ayah: number;
  reciter?: ReciterId;
  surahName?: string | null;
  compact?: boolean;
  className?: string;
}

// Routes through the global player store: tapping plays this verse in single
// mode through the one shared audio element and surfaces it in the mini-player.
export function AudioPlayer({ surah, ayah, reciter, surahName, compact = false, className }: AudioPlayerProps) {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const status = usePlayer((s) => s.status);
  const isThis = usePlayer((s) => {
    const c = s.queue[s.index];
    return !!c && c.surah === surah && c.ayah === ayah;
  });
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);

  const activeReciter = reciter ?? settings.reciter;
  const isPlaying = isThis && status === "playing";
  const isLoading = isThis && status === "loading";

  const handlePlayPause = () => {
    if (isThis) usePlayer.getState().toggle();
    else
      usePlayer.getState().playVerse(surah, ayah, {
        reciter: activeReciter,
        speed: settings.playbackSpeed,
        surahName: surahName ?? null,
      });
  };

  const handleSpeedChange = (newSpeed: number) => {
    updateSettings({ playbackSpeed: newSpeed });
    if (isThis) usePlayer.getState().setSpeed(newSpeed);
  };

  const progressPercent = isThis && duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center justify-center w-11 h-11 rounded-full transition-colors",
          "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary-light/20 dark:text-primary-light",
          "disabled:opacity-50",
          className,
        )}
        aria-label={isPlaying ? t("player.pause") : t("player.play")}
      >
        {isLoading ? <LoadingIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-bg-subtle dark:bg-bg-subtle-dark", className)}>
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        aria-label={isPlaying ? t("player.pause") : t("player.play")}
      >
        {isLoading ? <LoadingIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full rounded-full bg-bg-subtle dark:bg-bg-subtle-dark overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <select
        value={settings.playbackSpeed}
        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
        className="text-xs bg-transparent border border-border rounded px-1.5 py-1"
        aria-label={t("player.speed")}
      >
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1">1.0x</option>
      </select>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}
