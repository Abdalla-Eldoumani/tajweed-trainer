"use client";

import { useAudio } from "@/hooks/useAudio";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import type { ReciterId } from "@/lib/types";

interface AudioPlayerProps {
  surah: number;
  ayah: number;
  reciter?: ReciterId;
  compact?: boolean;
  className?: string;
}

export function AudioPlayer({ surah, ayah, reciter, compact = false, className }: AudioPlayerProps) {
  const { isPlaying, isLoading, error, currentTime, duration, play, pause, setSpeed } = useAudio();
  const { settings, updateSettings } = useSettings();

  const activeReciter = reciter ?? settings.reciter;

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play(surah, ayah, activeReciter, settings.playbackSpeed);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    updateSettings({ playbackSpeed: newSpeed });
    setSpeed(newSpeed);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center justify-center w-11 h-11 rounded-full transition-colors",
          "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary-light/20 dark:text-primary-light",
          "disabled:opacity-50",
          className
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <LoadingIcon />
        ) : isPlaying ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800", className)}>
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? <LoadingIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <select
        value={settings.playbackSpeed}
        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
        className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1"
        aria-label="Playback speed"
      >
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1">1.0x</option>
      </select>

      {error && <span className="text-xs text-red-500">{error}</span>}
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
    <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}
