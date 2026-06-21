"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { fetchSegments, activeWordIndex, type WordSegment } from "@/lib/audio-api";

export interface FollowAlongState {
  // The playing verse key ("surah:ayah") the active word belongs to, or null
  // when nothing is playing. A renderer compares this to its own verse so a tick
  // only matters to the verse actually being recited.
  verseKey: string | null;
  // The 0-based active word index, or -1 when there is no active word (no
  // segments, paused before the first word, between words, or not playing).
  activeIdx: number;
  // The verse's segments while it plays (for the sub-verse control's word labels
  // / counts), or null when none.
  segments: WordSegment[] | null;
  hasSegments: boolean;
}

// The single shared follow-along controller. It lifts the proven word-sync
// subscription out of WordByWord into one place every renderer (highlight,
// reveal, the sub-verse control's labels) reads, so there is exactly one source
// of the active word and one broad reader of the player's media time.
//
// CONST-02 (one engine, one time source): this hook only READS the existing
// player. It adds no <audio> element and no wall-clock timer. The active word
// derives from audio.currentTime, which advances in real recitation seconds and
// is inherently independent of playbackRate, so the highlight stays aligned at
// 0.5x / 0.75x / 1x with no scaling (FOLLOW-05).
export function useFollowAlong(): FollowAlongState {
  // The playing verse key. Gated on status !== "idle" (NOT playing || loading)
  // so the active word stays put while paused — reveal mode needs revealed words
  // to remain revealed on pause. Returns a primitive string, so identical-valued
  // ticks are Object.is-equal and do not re-render past the value changing.
  const verseKey = usePlayer((s) => {
    const c = s.queue[s.index];
    return c && s.status !== "idle" ? `${c.surah}:${c.ayah}` : null;
  });
  // The ONE media-time source (PlayerHost feeds it via audio.ontimeupdate). This
  // is the only place that reads it broadly; consumers scope to verseKey so a
  // time tick does not re-render the whole page.
  const currentTime = usePlayer((s) => s.currentTime);
  const reciter = usePlayer((s) => s.reciter);

  const [segments, setSegments] = useState<WordSegment[] | null>(null);

  // Fetch segments only while a verse is playing, refetching when the reciter
  // changes. A switch to a segment-less reciter (every everyayah ea-*, the Younes
  // surface, any ayah without segments) resolves null, turning the highlight off
  // without interrupting audio. Cleared when nothing plays so a stale highlight
  // never lingers. fetchSegments is cached and never throws.
  useEffect(() => {
    if (!verseKey) {
      setSegments(null);
      return;
    }
    const [surah, ayah] = verseKey.split(":").map(Number);
    let alive = true;
    fetchSegments(surah, ayah, reciter).then((segs) => {
      if (alive) setSegments(segs);
    });
    return () => {
      alive = false;
    };
  }, [verseKey, reciter]);

  // currentTime is seconds; the segment timing is milliseconds. On stop the store
  // flips status to "idle" (verseKey -> null) and zeroes currentTime, so the
  // active word clears with no extra logic.
  const activeIdx = verseKey && segments ? activeWordIndex(segments, currentTime * 1000) : -1;
  const hasSegments = !!segments && segments.length > 0;

  return { verseKey, activeIdx, segments, hasSegments };
}
