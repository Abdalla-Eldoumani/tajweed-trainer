"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getProgress,
  getModuleProgress,
  markLessonComplete as markComplete,
  saveQuizScore as saveScore,
  updateStreak as doUpdateStreak,
  resetProgress as doResetProgress,
} from "@/lib/storage";
import type { TajweedProgress, ModuleProgress } from "@/lib/types";

export function useProgress() {
  const [progress, setProgress] = useState<TajweedProgress>(() => getProgress());

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  const refresh = useCallback(() => {
    setProgress(getProgress());
  }, []);

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

  const markLessonComplete = useCallback(
    (moduleId: string, lessonId: string) => {
      markComplete(moduleId, lessonId);
      refresh();
    },
    [refresh]
  );

  const saveQuizScore = useCallback(
    (moduleId: string, lessonId: string, score: number) => {
      saveScore(moduleId, lessonId, score);
      refresh();
    },
    [refresh]
  );

  const updateStreak = useCallback(() => {
    doUpdateStreak();
    refresh();
  }, [refresh]);

  const resetProgress = useCallback(() => {
    doResetProgress();
    refresh();
  }, [refresh]);

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
