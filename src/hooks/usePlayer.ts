"use client";

import { create } from "zustand";
import type { PlayerMode, PlaybackStatus, ReciterId } from "@/lib/types";
import { DEFAULT_RECITER_ID } from "@/lib/reciters";
import { getPlayerResume, setPlayerResume } from "@/lib/storage";
import { buildRangeQueue, dedupeQueue, nextAfterEnded } from "@/lib/player-engine";

// The inter-verse gap presets (seconds). A free slider is intentionally avoided
// (UI-SPEC section 7); setInterVersePause clamps to the nearest preset.
const INTER_VERSE_PRESETS = [0, 1, 2, 4] as const;

export interface QueueItem {
  surah: number;
  ayah: number;
}

interface PlayOpts {
  reciter?: ReciterId;
  speed?: number;
  surahName?: string | null;
}

interface PlayerState {
  queue: QueueItem[];
  index: number;
  mode: PlayerMode;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  speed: number;
  reciter: ReciterId;
  surahName: string | null;
  // Non-null when the current verse failed to load (e.g. the chosen reciter has
  // no audio for it). The host sets it; the mini-player shows it and points the
  // user at the reciter picker. Cleared on the next successful (re)load attempt.
  error: string | null;
  // The host watches these tokens to drive the single <audio> element
  // imperatively: loadToken forces a (re)load of the current verse, seekToken a
  // seek. pendingOffset is the position to seek to right after the next load.
  loadToken: number;
  pendingOffset: number;
  seekToken: number;
  seekTarget: number;
  // Study-tool state: loop one ayah (repeatOne times), loop a verse range, and a
  // stop-at-end-of-surah sleep flag. repeatsDone / rangeLoopsDone are counters.
  repeatOne: number;
  repeatsDone: number;
  repeatRange: { from: number; to: number; count: number } | null;
  rangeLoopsDone: number;
  sleepEndOfSurah: boolean;
  // Wall-clock ms after which playback stops; null when no minutes timer is set.
  sleepDeadline: number | null;
  // Whole-queue loop: replay the current queue from index 0 when it ends. Distinct
  // from the ayah-based repeatRange; works for any queue (a range or a hand-picked
  // set). interVersePause is the gap (seconds, one of INTER_VERSE_PRESETS) the host
  // waits between queue items; 0 advances immediately as before.
  loopSelection: boolean;
  interVersePause: number;

  current: () => QueueItem | null;
  hasNext: () => boolean;
  hasPrev: () => boolean;

  playVerse: (surah: number, ayah: number, opts?: PlayOpts) => void;
  playSurah: (surah: number, fromAyah: number, ayahCount: number, opts?: PlayOpts) => void;
  // Play a hand-picked, possibly non-contiguous set as one queue (deduped). Loops
  // via loopSelection, never the ayah-based repeatRange.
  playSet: (items: QueueItem[], opts?: PlayOpts) => void;
  // Play a contiguous range within one surah as one queue (normalized).
  playRange: (surah: number, from: number, to: number, opts?: PlayOpts) => void;
  setLoopSelection: (on: boolean) => void;
  setInterVersePause: (seconds: number) => void;
  toggle: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setSpeed: (s: number) => void;
  setMode: (m: PlayerMode, ayahCount?: number) => void;
  setRepeatOne: (count: number) => void;
  setRepeatRange: (from: number, to: number, count: number) => void;
  clearRepeat: () => void;
  setSleepEndOfSurah: (on: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;
  stop: () => void;
  restore: () => void;
  // The host reports a failed verse load here so the UI can prompt a reciter
  // change; passing null clears it.
  setError: (message: string | null) => void;

  // Called by the audio host in response to media element events.
  onLoaded: (duration: number) => void;
  onTime: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  persist: () => void;
}

function buildSurahQueue(surah: number, count: number): QueueItem[] {
  const q: QueueItem[] = [];
  for (let a = 1; a <= count; a++) q.push({ surah, ayah: a });
  return q;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: 0,
  mode: "single",
  status: "idle",
  currentTime: 0,
  duration: 0,
  speed: 1,
  reciter: DEFAULT_RECITER_ID,
  surahName: null,
  error: null,
  loadToken: 0,
  pendingOffset: 0,
  seekToken: 0,
  seekTarget: 0,
  repeatOne: 0,
  repeatsDone: 0,
  repeatRange: null,
  rangeLoopsDone: 0,
  sleepEndOfSurah: false,
  sleepDeadline: null,
  loopSelection: false,
  interVersePause: 0,

  current: () => get().queue[get().index] ?? null,
  hasNext: () => get().index < get().queue.length - 1,
  hasPrev: () => get().index > 0,

  playVerse: (surah, ayah, opts = {}) =>
    set((s) => ({
      queue: [{ surah, ayah }],
      index: 0,
      mode: "single",
      status: "loading",
      reciter: opts.reciter ?? s.reciter,
      speed: opts.speed ?? s.speed,
      surahName: opts.surahName ?? null,
      currentTime: 0,
      duration: 0,
      pendingOffset: 0,
      // A plain tap is single -> paused; clear any study-tool flags left from a
      // prior selection so the tapped verse does not inherit repeat/loop.
      repeatOne: 0,
      repeatsDone: 0,
      repeatRange: null,
      rangeLoopsDone: 0,
      loopSelection: false,
      error: null,
      loadToken: s.loadToken + 1,
    })),

  playSurah: (surah, fromAyah, ayahCount, opts = {}) =>
    set((s) => ({
      queue: buildSurahQueue(surah, ayahCount),
      index: Math.max(0, Math.min(fromAyah - 1, ayahCount - 1)),
      mode: "continuous",
      status: "loading",
      reciter: opts.reciter ?? s.reciter,
      speed: opts.speed ?? s.speed,
      surahName: opts.surahName ?? null,
      currentTime: 0,
      duration: 0,
      pendingOffset: 0,
      // Continuous surah play stops idle at the end; clear study-tool flags left
      // from a prior selection so it does not inherit repeat/loop.
      repeatOne: 0,
      repeatsDone: 0,
      repeatRange: null,
      rangeLoopsDone: 0,
      loopSelection: false,
      error: null,
      loadToken: s.loadToken + 1,
    })),

  playSet: (items, opts = {}) =>
    set((s) => {
      const queue = dedupeQueue(items);
      if (queue.length === 0) return {};
      return {
        queue,
        index: 0,
        // A set is a queue, so it plays continuously; looping is handled by
        // loopSelection, not repeatRange (which assumes a contiguous surah).
        mode: "continuous",
        status: "loading",
        reciter: opts.reciter ?? s.reciter,
        speed: opts.speed ?? s.speed,
        surahName: opts.surahName ?? null,
        currentTime: 0,
        duration: 0,
        pendingOffset: 0,
        repeatOne: 0,
        repeatsDone: 0,
        repeatRange: null,
        rangeLoopsDone: 0,
        error: null,
        loadToken: s.loadToken + 1,
      };
    }),

  playRange: (surah, from, to, opts = {}) =>
    set((s) => {
      const queue = buildRangeQueue(surah, from, to);
      if (queue.length === 0) return {};
      return {
        queue,
        index: 0,
        mode: "continuous",
        status: "loading",
        reciter: opts.reciter ?? s.reciter,
        speed: opts.speed ?? s.speed,
        surahName: opts.surahName ?? null,
        currentTime: 0,
        duration: 0,
        pendingOffset: 0,
        repeatOne: 0,
        repeatsDone: 0,
        // The whole-range loop is loopSelection's job; clear the ayah-based one.
        repeatRange: null,
        rangeLoopsDone: 0,
        error: null,
        loadToken: s.loadToken + 1,
      };
    }),

  toggle: () => {
    const s = get();
    if (s.status === "playing") return s.pause();
    if (s.queue.length === 0) return;
    // From a fully stopped state, force a reload; otherwise just resume.
    if (s.status === "idle") set({ status: "loading", error: null, loadToken: s.loadToken + 1 });
    else set({ status: "playing", error: null });
  },

  pause: () => {
    set({ status: "paused" });
    get().persist();
  },
  resume: () => {
    if (get().queue.length > 0) set({ status: "playing" });
  },

  next: () =>
    set((s) =>
      s.index < s.queue.length - 1
        ? { index: s.index + 1, status: "loading", currentTime: 0, duration: 0, pendingOffset: 0, repeatsDone: 0, error: null, loadToken: s.loadToken + 1 }
        : {},
    ),
  prev: () =>
    set((s) =>
      s.index > 0
        ? { index: s.index - 1, status: "loading", currentTime: 0, duration: 0, pendingOffset: 0, repeatsDone: 0, error: null, loadToken: s.loadToken + 1 }
        : { seekTarget: 0, seekToken: s.seekToken + 1, currentTime: 0 },
    ),

  seek: (t) => set((s) => ({ seekTarget: t, seekToken: s.seekToken + 1, currentTime: t })),
  setSpeed: (speed) => set({ speed }),

  setMode: (mode, ayahCount) =>
    set((s) => {
      if (mode === s.mode) return {};
      const cur = s.queue[s.index];
      if (mode === "continuous") {
        if (!cur || !ayahCount) return { mode };
        return { mode, queue: buildSurahQueue(cur.surah, ayahCount), index: cur.ayah - 1 };
      }
      // continuous -> single: keep only the current verse; it stops at its end.
      return { mode, queue: cur ? [cur] : [], index: 0 };
    }),

  setRepeatOne: (count) =>
    set({ repeatOne: Math.max(0, Math.floor(count) || 0), repeatsDone: 0, repeatRange: null }),
  setRepeatRange: (from, to, count) =>
    set((s) => {
      const f = Math.floor(from);
      const tt = Math.floor(to);
      const c = Math.floor(count);
      if (!(f >= 1 && tt >= f && c >= 1) || s.queue.length === 0) {
        return { repeatRange: null, rangeLoopsDone: 0 };
      }
      // Reposition onto the range start and (re)start playback; onEnded then
      // walks f..to and loops back c times. Assumes the continuous surah queue
      // (index === ayah - 1) that playSurah builds, so range looping only makes
      // sense once a surah is playing.
      const startIndex = Math.min(Math.max(0, f - 1), s.queue.length - 1);
      return {
        repeatRange: { from: f, to: tt, count: c },
        rangeLoopsDone: 0,
        repeatsDone: 0,
        repeatOne: 0,
        mode: "continuous",
        index: startIndex,
        status: "loading",
        currentTime: 0,
        duration: 0,
        pendingOffset: 0,
        loadToken: s.loadToken + 1,
      };
    }),
  clearRepeat: () => set({ repeatOne: 0, repeatsDone: 0, repeatRange: null, rangeLoopsDone: 0 }),
  // The whole-queue loop and the ayah-based range loop are mutually exclusive:
  // turning loopSelection on clears repeatRange. It does not restart playback;
  // onEnded picks it up at the next queue boundary.
  setLoopSelection: (on) =>
    set(on ? { loopSelection: true, repeatRange: null, rangeLoopsDone: 0 } : { loopSelection: false }),
  setInterVersePause: (seconds) =>
    set({
      interVersePause: INTER_VERSE_PRESETS.includes(seconds as (typeof INTER_VERSE_PRESETS)[number])
        ? seconds
        : INTER_VERSE_PRESETS.reduce((best, p) => (Math.abs(p - seconds) < Math.abs(best - seconds) ? p : best), 0),
    }),
  // Sleep modes are mutually exclusive: choosing one clears the other.
  setSleepEndOfSurah: (on) => set(on ? { sleepEndOfSurah: true, sleepDeadline: null } : { sleepEndOfSurah: false }),
  setSleepTimer: (minutes) =>
    set(
      typeof minutes === "number" && minutes > 0
        ? { sleepDeadline: Date.now() + minutes * 60000, sleepEndOfSurah: false }
        : { sleepDeadline: null },
    ),

  stop: () => {
    set({ status: "idle", currentTime: 0, sleepDeadline: null, error: null });
    get().persist();
  },

  setError: (message) => set({ error: message }),

  restore: () => {
    const r = getPlayerResume();
    if (!r) return;
    set((s) => ({
      queue: [{ surah: r.surah, ayah: r.ayah }],
      index: 0,
      mode: r.mode,
      reciter: r.reciter,
      status: "paused",
      currentTime: r.offset,
      duration: 0,
      pendingOffset: r.offset,
      surahName: null,
      loadToken: s.loadToken + 1,
    }));
  },

  onLoaded: (duration) => set({ duration }),
  onTime: (currentTime, duration) => set((s) => ({ currentTime, duration: duration || s.duration })),
  onEnded: () => {
    const s = get();
    const cur = s.queue[s.index];
    // The pure engine decides the next index/status; this only applies it, with
    // the exact same field writes as before, so existing paths (repeat-one,
    // range walk/loop, continuous advance, stop) are byte-for-byte equivalent.
    // The inter-verse gap is scheduled by PlayerHost off this same advance; at
    // interVersePause 0 the host advances immediately, unchanged from today.
    const decision = nextAfterEnded({
      repeatOne: s.repeatOne,
      repeatsDone: s.repeatsDone,
      repeatRange: s.repeatRange,
      rangeLoopsDone: s.rangeLoopsDone,
      loopSelection: s.loopSelection,
      mode: s.mode,
      index: s.index,
      queueLength: s.queue.length,
      currentAyah: cur ? cur.ayah : 0,
      sleepEndOfSurah: s.sleepEndOfSurah,
    });

    switch (decision.kind) {
      case "repeat-one":
        // Loop the current ayah a set number of times before moving on.
        return set({
          repeatsDone: s.repeatsDone + 1,
          status: "loading",
          currentTime: 0,
          duration: 0,
          pendingOffset: 0,
          loadToken: s.loadToken + 1,
        });
      case "advance":
        // Range walk, loop-selection step, or continuous auto-advance: all three
        // wrote this identical shape before, so a single handler is unchanged.
        return set({
          repeatsDone: 0,
          index: decision.index,
          status: "loading",
          currentTime: 0,
          duration: 0,
          pendingOffset: 0,
          loadToken: s.loadToken + 1,
        });
      case "loop-range":
        return set({
          repeatsDone: 0,
          rangeLoopsDone: s.rangeLoopsDone + 1,
          index: decision.index,
          status: "loading",
          currentTime: 0,
          duration: 0,
          pendingOffset: 0,
          loadToken: s.loadToken + 1,
        });
      case "loop-selection":
        return set({
          repeatsDone: 0,
          index: decision.index,
          status: "loading",
          currentTime: 0,
          duration: 0,
          pendingOffset: 0,
          loadToken: s.loadToken + 1,
        });
      case "stop":
        // Range exhaustion clears the range exactly as before; the generic end
        // just resets the repeat counter. Both persist the resume position.
        if (s.repeatRange) {
          set({ repeatsDone: 0, rangeLoopsDone: 0, repeatRange: null, status: decision.status, currentTime: 0 });
        } else {
          set({ repeatsDone: 0, status: decision.status, currentTime: 0 });
        }
        get().persist();
        return;
    }
  },

  persist: () => {
    const s = get();
    const cur = s.queue[s.index];
    if (!cur) {
      setPlayerResume(null);
      return;
    }
    setPlayerResume({ surah: cur.surah, ayah: cur.ayah, mode: s.mode, offset: s.currentTime, reciter: s.reciter });
  },
}));
