import type { TajweedProgress } from "./types";

export interface ModuleScoreSummary {
  lastScore: number | null;
  quizzesTaken: number;
  lastDate: string | null;
}

// Last quiz score and quizzes-taken count for a practice hub tile. Reads only
// saved progress, so it carries none of the question-pool content into the
// client bundle — the hub imports this instead of question-pool for scores.
export function getModuleLastScore(progress: TajweedProgress, moduleId: string): ModuleScoreSummary {
  const scores = progress.modules[moduleId]?.quizScores ?? [];
  if (scores.length === 0) {
    return { lastScore: null, quizzesTaken: 0, lastDate: null };
  }
  // Latest by date string (ISO sorts lexicographically).
  const latest = scores.reduce((acc, s) => (s.date > acc.date ? s : acc), scores[0]);
  return {
    lastScore: latest.score,
    quizzesTaken: scores.length,
    lastDate: latest.date,
  };
}
