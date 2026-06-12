"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_PROGRESS,
  STORAGE_KEY,
  getProgress,
  markLessonComplete as markComplete,
  saveQuizScore as saveScore,
  updateStreak as doUpdateStreak,
  resetProgress as doResetProgress,
} from "@/lib/storage";
import { subscribeProgressChanged, emitProgressChanged } from "@/lib/progress-events";
import type { TajweedProgress, ModuleProgress } from "@/lib/types";

// One snapshot for the whole tab. Every component that calls useProgress reads
// this object, and every write to storage refreshes it and notifies React, so
// the sidebar, the learn grid, and an open lesson can never disagree about
// what is unlocked. The old implementation gave each component its own
// useState copy of localStorage; a write through one copy left every other
// copy stale until remount, and reading localStorage during the hydration
// render made the first client paint diverge from the server HTML.
let snapshot: TajweedProgress = EMPTY_PROGRESS;
let hydrated = false;

function refreshSnapshot(): void {
  snapshot = getProgress();
}

function getSnapshot(): TajweedProgress {
  // First client read pulls localStorage in; afterwards only writes refresh it.
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    refreshSnapshot();
  }
  return snapshot;
}

function getServerSnapshot(): TajweedProgress {
  return EMPTY_PROGRESS;
}

// Permanent module-level listener, registered before any component listener so
// Set iteration refreshes the cache first, then notifies React. This keeps the
// snapshot current even for writes from code that never mounts useProgress
// (the player host persisting resume state, for example).
subscribeProgressChanged(refreshSnapshot);

let componentListeners = 0;

function subscribe(onStoreChange: () => void): () => void {
  // First subscriber after a gap with no mounted consumers re-reads storage,
  // covering cross-tab writes whose storage events had no listener to catch.
  if (componentListeners === 0) refreshSnapshot();
  componentListeners += 1;
  const unsubscribeLocal = subscribeProgressChanged(onStoreChange);
  // Writes from other tabs arrive through the browser's storage event (a null
  // key means localStorage.clear()). Re-broadcast on the in-tab channel so
  // every subscriber refreshes from one code path.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    emitProgressChanged();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    componentListeners -= 1;
    unsubscribeLocal();
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const moduleProgress = useCallback(
    (moduleId: string): ModuleProgress => {
      return progress.modules[moduleId] ?? {
        lessonsCompleted: [],
        quizScores: [],
        lastAccessed: "",
      };
    },
    [progress]
  );

  // Mutators write through storage, which persists and emits the change; the
  // snapshot refresh happens in the subscription, so no manual re-read here.
  const markLessonComplete = useCallback((moduleId: string, lessonId: string) => {
    markComplete(moduleId, lessonId);
  }, []);

  const saveQuizScore = useCallback((moduleId: string, lessonId: string, score: number) => {
    saveScore(moduleId, lessonId, score);
  }, []);

  const updateStreak = useCallback(() => {
    doUpdateStreak();
  }, []);

  const resetProgress = useCallback(() => {
    doResetProgress();
  }, []);

  const getOverallCompletion = useCallback(
    (totalLessons: Record<string, number>): number => {
      let completed = 0;
      let total = 0;
      for (const [moduleId, count] of Object.entries(totalLessons)) {
        total += count;
        completed += (progress.modules[moduleId]?.lessonsCompleted.length ?? 0);
      }
      return total === 0 ? 0 : Math.round((completed / total) * 100);
    },
    [progress]
  );

  return {
    progress,
    moduleProgress,
    markLessonComplete,
    saveQuizScore,
    updateStreak,
    resetProgress,
    getOverallCompletion,
  };
}
