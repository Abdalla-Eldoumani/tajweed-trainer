import type { TajweedProgress } from "./types";

export type MasteryLevel = "untouched" | "started" | "practiced" | "strong";

export interface ModuleMastery {
  moduleId: string;
  quizzesTaken: number;
  bestScore: number | null; // 0-100, null when no quiz taken
  latestScore: number | null;
  reviewed: number; // module questions with a Leitner review entry
  mastered: number; // of those, in the top box
  due: number; // of those, due for review today
  level: MasteryLevel;
}

// Leitner top box (mirrors MASTERY_BOX in spaced-repetition.ts; kept local so
// this module imports only types and stays unit-testable without the content).
const MASTERY_BOX = 5;

// Pure aggregation of saved progress into per-module mastery rows. The caller
// passes the question -> module map (built from the pool) and the module id
// order, so this function has no content or storage imports. Per-module only
// (per-rule has no accuracy signal — see the phase derivation note).
export function getModuleMastery(
  progress: TajweedProgress,
  questionModuleMap: Record<string, string>,
  moduleIds: string[],
  today: string,
): ModuleMastery[] {
  // One pass over reviews, attributing each to its module.
  const reviewAgg: Record<string, { reviewed: number; mastered: number; due: number }> = {};
  for (const [qid, state] of Object.entries(progress.reviews ?? {})) {
    const m = questionModuleMap[qid];
    if (!m) continue;
    const agg = (reviewAgg[m] ??= { reviewed: 0, mastered: 0, due: 0 });
    agg.reviewed += 1;
    if (state.box === MASTERY_BOX) agg.mastered += 1;
    if (state.nextDueDate <= today) agg.due += 1;
  }

  return moduleIds.map((moduleId) => {
    const scores = progress.modules[moduleId]?.quizScores ?? [];
    let bestScore: number | null = null;
    let latestScore: number | null = null;
    let latestDate = "";
    for (const s of scores) {
      bestScore = bestScore === null ? s.score : Math.max(bestScore, s.score);
      // ISO date strings sort lexicographically; ties keep the later array entry.
      if (s.date >= latestDate) {
        latestDate = s.date;
        latestScore = s.score;
      }
    }
    const r = reviewAgg[moduleId] ?? { reviewed: 0, mastered: 0, due: 0 };
    const quizzesTaken = scores.length;

    let level: MasteryLevel;
    if (quizzesTaken === 0 && r.reviewed === 0) {
      level = "untouched";
    } else {
      const best = bestScore ?? 0;
      const masteredRatio = r.reviewed > 0 ? r.mastered / r.reviewed : 0;
      if (best >= 80 && (r.reviewed === 0 || masteredRatio >= 0.6)) level = "strong";
      else if (best >= 60 || r.mastered > 0) level = "practiced";
      else level = "started";
    }

    return {
      moduleId,
      quizzesTaken,
      bestScore,
      latestScore,
      reviewed: r.reviewed,
      mastered: r.mastered,
      due: r.due,
      level,
    };
  });
}
