"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fetchAudioUrl } from "@/lib/audio-api";
import type { ReciterId } from "@/lib/types";

interface UseAudioReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  play: (surah: number, ayah: number, reciter?: ReciterId, speed?: number) => Promise<void>;
  pause: () => void;
  setSpeed: (speed: number) => void;
}

export function useAudio(): UseAudioReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // Create Audio element once on mount, clean up on unmount
  useEffect(() => {
    audioRef.current = new Audio();
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onloadedmetadata = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, []);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onloadedmetadata = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    cancelAnimationFrame(animFrameRef.current);
    if (mountedRef.current) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, []);

  const updateProgress = useCallback(() => {
    if (audioRef.current && mountedRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
      if (!audioRef.current.paused) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, []);

  const play = useCallback(
    async (surah: number, ayah: number, reciter: ReciterId = "husary", speed: number = 1.0) => {
      stopCurrent();
      setIsLoading(true);
      setError(null);

      try {
        const audioUrl = await fetchAudioUrl(surah, ayah, reciter);
        if (!audioRef.current || !mountedRef.current) return;

        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = speed;

        audioRef.current.onloadedmetadata = () => {
          if (audioRef.current && isFinite(audioRef.current.duration) && mountedRef.current) {
            setDuration(audioRef.current.duration);
          }
        };

        audioRef.current.onended = () => {
          if (mountedRef.current) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
          cancelAnimationFrame(animFrameRef.current);
        };

        audioRef.current.onerror = () => {
          if (mountedRef.current) {
            setError("Failed to load audio");
            setIsPlaying(false);
            setIsLoading(false);
          }
        };

        await audioRef.current.play();
        if (mountedRef.current) {
          setIsPlaying(true);
          setIsLoading(false);
        }
        animFrameRef.current = requestAnimationFrame(updateProgress);
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to play audio");
          setIsPlaying(false);
          setIsLoading(false);
        }
      }
    },
    [stopCurrent, updateProgress]
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  return { isPlaying, isLoading, error, currentTime, duration, play, pause, setSpeed };
}
