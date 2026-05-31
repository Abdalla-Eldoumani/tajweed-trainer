"use client";

import { create } from "zustand";
import type { PlayerMode, PlaybackStatus, ReciterId } from "@/lib/types";
import { DEFAULT_RECITER_ID } from "@/lib/reciters";
import { getPlayerResume, setPlayerResume } from "@/lib/storage";

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

  current: () => QueueItem | null;
  hasNext: () => boolean;
  hasPrev: () => boolean;

  playVerse: (surah: number, ayah: number, opts?: PlayOpts) => void;
  playSurah: (surah: number, fromAyah: number, ayahCount: number, opts?: PlayOpts) => void;
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
  stop: () => void;
  restore: () => void;

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
  loadToken: 0,
  pendingOffset: 0,
  seekToken: 0,
  seekTarget: 0,
  repeatOne: 0,
  repeatsDone: 0,
  repeatRange: null,
  rangeLoopsDone: 0,
  sleepEndOfSurah: false,

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
      loadToken: s.loadToken + 1,
    })),

  toggle: () => {
    const s = get();
    if (s.status === "playing") return s.pause();
    if (s.queue.length === 0) return;
    // From a fully stopped state, force a reload; otherwise just resume.
    if (s.status === "idle") set({ status: "loading", loadToken: s.loadToken + 1 });
    else set({ status: "playing" });
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
        ? { index: s.index + 1, status: "loading", currentTime: 0, duration: 0, pendingOffset: 0, repeatsDone: 0, loadToken: s.loadToken + 1 }
        : {},
    ),
  prev: () =>
    set((s) =>
      s.index > 0
        ? { index: s.index - 1, status: "loading", currentTime: 0, duration: 0, pendingOffset: 0, repeatsDone: 0, loadToken: s.loadToken + 1 }
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
    set(
      from >= 1 && to >= from && count >= 1
        ? { repeatRange: { from: Math.floor(from), to: Math.floor(to), count: Math.floor(count) }, rangeLoopsDone: 0, repeatOne: 0 }
        : { repeatRange: null, rangeLoopsDone: 0 },
    ),
  clearRepeat: () => set({ repeatOne: 0, repeatsDone: 0, repeatRange: null, rangeLoopsDone: 0 }),
  setSleepEndOfSurah: (on) => set({ sleepEndOfSurah: !!on }),

  stop: () => {
    set({ status: "idle", currentTime: 0 });
    get().persist();
  },

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

    // Loop the current ayah a set number of times before moving on.
    if (s.repeatOne > 0 && s.repeatsDone + 1 < s.repeatOne) {
      return set({
        repeatsDone: s.repeatsDone + 1,
        status: "loading",
        currentTime: 0,
        duration: 0,
        pendingOffset: 0,
        loadToken: s.loadToken + 1,
      });
    }

    // Loop a verse range [from,to] `count` times, then stop.
    if (s.repeatRange) {
      const cur = s.queue[s.index];
      const { from, to, count } = s.repeatRange;
      if (cur && cur.ayah < to && s.index < s.queue.length - 1) {
        return set({
          repeatsDone: 0,
          index: s.index + 1,
          status: "loading",
          currentTime: 0,
          duration: 0,
          pendingOffset: 0,
          loadToken: s.loadToken + 1,
        });
      }
      if (s.rangeLoopsDone + 1 < count) {
        return set({
          repeatsDone: 0,
          rangeLoopsDone: s.rangeLoopsDone + 1,
          index: Math.max(0, from - 1),
          status: "loading",
          currentTime: 0,
          duration: 0,
          pendingOffset: 0,
          loadToken: s.loadToken + 1,
        });
      }
      set({ repeatsDone: 0, rangeLoopsDone: 0, repeatRange: null, status: "idle", currentTime: 0 });
      get().persist();
      return;
    }

    // Continuous mode auto-advances unless the sleep timer stops at the surah end.
    if (s.mode === "continuous" && s.index < s.queue.length - 1 && !s.sleepEndOfSurah) {
      return set({
        repeatsDone: 0,
        index: s.index + 1,
        status: "loading",
        currentTime: 0,
        duration: 0,
        pendingOffset: 0,
        loadToken: s.loadToken + 1,
      });
    }

    // End of surah (continuous) or the sleep boundary stops; single returns to paused.
    set({ repeatsDone: 0, status: s.mode === "single" ? "paused" : "idle", currentTime: 0 });
    get().persist();
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
