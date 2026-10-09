import { describe, it, expect } from "vitest";
import {
  getModuleById,
  getPrerequisite,
  isQuizFinished,
  isModuleUnlocked,
  getLockedModuleIds,
} from "@/lib/module-unlock";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule, ModuleProgress, TajweedProgress } from "@/lib/types";

// NEW unit test for the single-source module-gating rule. module-unlock.ts was
// only exercised by the browser verify:ui script before; this closes the
// coverage gap. The gating truth (quiz-based unlock) is asserted against the REAL
// exports over the shipped learning-path.json - the rule is never reimplemented
// here. Landmine: lessons alone must NEVER unlock; only a
// quizScores entry on the prerequisite does; the mixed/review keys never unlock.

const allModules = learningPath.modules as LearningModule[];

// The gating functions read only `progress.modules`, so a fixture with just that
// field (cast to the full shape) exercises the real code path exactly.
function progressWith(modules: Record<string, Partial<ModuleProgress>>): TajweedProgress {
  const full: Record<string, ModuleProgress> = {};
  for (const [id, mod] of Object.entries(modules)) {
    full[id] = { lessonsCompleted: [], quizScores: [], lastAccessed: "", ...mod };
  }
  return { modules: full } as unknown as TajweedProgress;
}

const aQuizScore = { lessonId: "quiz", score: 40, date: "2026-07-01T00:00:00.000Z" };
const EMPTY = progressWith({});

describe("getModuleById / getPrerequisite over the learning path", () => {
  it("resolves a real module and its ordered prerequisite chain", () => {
    expect(getModuleById("makharij")?.order).toBe(1);
    expect(getModuleById("nonexistent")).toBeNull();

    // makharij is the root (no prerequisite); noon-sakinah requires makharij.
    expect(getPrerequisite("makharij")).toBeNull();
    expect(getPrerequisite("noon-sakinah")?.id).toBe("makharij");
  });
});

describe("isModuleUnlocked - quiz-based gating", () => {
  it("the first module (no prerequisite) is unlocked on empty progress", () => {
    expect(isModuleUnlocked(EMPTY, "makharij")).toBe(true);
  });

  it("a gated module stays locked until the prerequisite's quiz is finished", () => {
    expect(isModuleUnlocked(EMPTY, "noon-sakinah")).toBe(false);

    const withQuiz = progressWith({ makharij: { quizScores: [aQuizScore] } });
    expect(isQuizFinished(withQuiz, "makharij")).toBe(true);
    expect(isModuleUnlocked(withQuiz, "noon-sakinah")).toBe(true);
  });

  it("REGRESSION: completing lessons alone does NOT unlock the next module", () => {
    // The prerequisite has lessons marked complete but no quiz score. This is the
    // exact bug the single-source rule fixed: lessons alone once opened the gate.
    const lessonsOnly = progressWith({
      makharij: { lessonsCompleted: ["m1", "m2", "m3"], quizScores: [] },
    });
    expect(isQuizFinished(lessonsOnly, "makharij")).toBe(false);
    expect(isModuleUnlocked(lessonsOnly, "noon-sakinah")).toBe(false);
  });

  it("an unknown module id fails open (unlocked) so a content typo cannot brick the path", () => {
    expect(isModuleUnlocked(EMPTY, "nonexistent")).toBe(true);
  });
});

describe("mixed / review keys never unlock a module", () => {
  it("no module in the learning path names mixed or review as a prerequisite", () => {
    // Mixed Review and Review Due save under their own `mixed` / `review` keys, so
    // they can never satisfy any module's prerequisite.
    for (const mod of allModules) {
      expect(mod.prerequisite).not.toBe("mixed");
      expect(mod.prerequisite).not.toBe("review");
    }
  });

  it("quiz scores saved under mixed/review do not unlock the gated module", () => {
    const mixedAndReview = progressWith({
      mixed: { quizScores: [aQuizScore] },
      review: { quizScores: [aQuizScore] },
      // makharij (noon-sakinah's real prerequisite) has NO quiz score.
    });
    expect(isModuleUnlocked(mixedAndReview, "noon-sakinah")).toBe(false);
  });
});

describe("getLockedModuleIds", () => {
  it("locks every module past the root on empty progress", () => {
    const locked = getLockedModuleIds(EMPTY);
    expect(locked.has("makharij")).toBe(false); // root is always open
    for (const mod of allModules) {
      if (mod.id === "makharij") continue;
      expect(locked.has(mod.id)).toBe(true);
    }
  });

  it("finishing makharij's quiz unlocks exactly the next module", () => {
    const locked = getLockedModuleIds(progressWith({ makharij: { quizScores: [aQuizScore] } }));
    expect(locked.has("makharij")).toBe(false);
    expect(locked.has("noon-sakinah")).toBe(false); // now unlocked
    expect(locked.has("meem-sakinah")).toBe(true); // still gated behind noon-sakinah's quiz
  });
});
