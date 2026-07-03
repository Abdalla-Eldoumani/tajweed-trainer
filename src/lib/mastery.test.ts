import { describe, it, expect } from "vitest";
import { getModuleMastery } from "@/lib/mastery";
import type { ModuleProgress, ReviewBox, ReviewState, TajweedProgress } from "@/lib/types";

// Migrated from scripts/verify-mastery.mjs. These call the REAL getModuleMastery
// so a regression in the aggregation or the level thresholds fails the suite; no
// arithmetic is re-derived here. The question-to-module map is passed as an
// argument (the function takes it so it stays content/storage free).

const today = "2026-06-13";

// getModuleMastery reads only `modules` and `reviews`; the rest of the
// TajweedProgress shape is irrelevant to the math, so a minimal object is
// asserted into the full type rather than filled out field by field.
type ProgressStub = Pick<TajweedProgress, "modules" | "reviews">;
const progress = (p: ProgressStub): TajweedProgress => p as TajweedProgress;

const mod = (quizScores: ModuleProgress["quizScores"]): ModuleProgress => ({
  lessonsCompleted: [],
  quizScores,
  lastAccessed: "",
});

const rev = (box: ReviewBox, due: string): ReviewState => ({
  box,
  nextDueDate: due,
  lastSeenDate: "",
  timesSeen: 1,
  timesCorrect: 1,
});

const empty = progress({ modules: {}, reviews: {} });

describe("getModuleMastery - fresh user", () => {
  it("every module is untouched with no score and no quiz", () => {
    const rows = getModuleMastery(empty, {}, ["makharij", "ghunnah"], today);
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.level).toBe("untouched");
      expect(r.bestScore).toBeNull();
      expect(r.latestScore).toBeNull();
      expect(r.quizzesTaken).toBe(0);
    }
  });
});

describe("getModuleMastery - best and latest score selection", () => {
  it("bestScore is the max; latestScore is the newest-date entry", () => {
    const p = progress({
      modules: {
        makharij: mod([
          { lessonId: "quiz", score: 70, date: "2026-01-01" },
          { lessonId: "quiz", score: 90, date: "2026-01-03" },
          { lessonId: "quiz", score: 50, date: "2026-01-02" },
        ]),
      },
      reviews: {},
    });
    const [r] = getModuleMastery(p, {}, ["makharij"], today);
    expect(r.bestScore).toBe(90);
    expect(r.latestScore).toBe(90);
    expect(r.quizzesTaken).toBe(3);
  });

  it("latestScore follows the date, not the best value", () => {
    // Newest date carries a lower score than the best.
    const p = progress({
      modules: {
        makharij: mod([
          { lessonId: "quiz", score: 95, date: "2026-01-01" },
          { lessonId: "quiz", score: 40, date: "2026-02-01" },
        ]),
      },
      reviews: {},
    });
    const [r] = getModuleMastery(p, {}, ["makharij"], today);
    expect(r.bestScore).toBe(95);
    expect(r.latestScore).toBe(40);
  });
});

describe("getModuleMastery - level thresholds (no reviews)", () => {
  const levelFor = (score: number): string =>
    getModuleMastery(
      progress({
        modules: { m: mod([{ lessonId: "quiz", score, date: "2026-01-01" }]) },
        reviews: {},
      }),
      {},
      ["m"],
      today,
    )[0].level;

  it("best >= 80 with no reviews -> strong", () => {
    expect(levelFor(85)).toBe("strong");
  });

  it("best 60-79 -> practiced", () => {
    expect(levelFor(70)).toBe("practiced");
  });

  it("best < 60 with no mastery -> started", () => {
    expect(levelFor(40)).toBe("started");
  });
});

describe("getModuleMastery - review aggregation", () => {
  // q1 box5/future, q2 box2/past, q3 box3/future are mapped; qX box5/past is not.
  const reviews = {
    q1: rev(5, "2999-01-01"),
    q2: rev(2, "2020-01-01"),
    q3: rev(3, "2999-01-01"),
    qX: rev(5, "2020-01-01"),
  };
  const map = { q1: "makharij", q2: "makharij", q3: "makharij" };
  const [r] = getModuleMastery(progress({ modules: {}, reviews }), map, ["makharij"], today);

  it("reviewed counts mapped questions only (qX ignored)", () => {
    expect(r.reviewed).toBe(3);
  });

  it("mastered counts box 5 only", () => {
    expect(r.mastered).toBe(1);
  });

  it("due counts nextDueDate <= today", () => {
    expect(r.due).toBe(1);
  });
});

describe("getModuleMastery - strong requires >=60% mastered when reviews exist", () => {
  it("landmine: a high score with a low mastered ratio is NOT strong", () => {
    // 1 of 3 reviewed in the top box (ratio 1/3 < 0.6), best score 95.
    const reviews = {
      q1: rev(5, "2999-01-01"),
      q2: rev(1, "2999-01-01"),
      q3: rev(1, "2999-01-01"),
    };
    const map = { q1: "m", q2: "m", q3: "m" };
    const p = progress({
      modules: { m: mod([{ lessonId: "quiz", score: 95, date: "2026-01-01" }]) },
      reviews,
    });
    const [r] = getModuleMastery(p, map, ["m"], today);
    expect(r.level).not.toBe("strong");
  });

  it("the same high score IS strong once the mastered ratio reaches 60%", () => {
    // 2 of 3 in the top box (ratio 2/3 >= 0.6), best score 95.
    const reviews = {
      q1: rev(5, "2999-01-01"),
      q2: rev(5, "2999-01-01"),
      q3: rev(1, "2999-01-01"),
    };
    const map = { q1: "m", q2: "m", q3: "m" };
    const p = progress({
      modules: { m: mod([{ lessonId: "quiz", score: 95, date: "2026-01-01" }]) },
      reviews,
    });
    const [r] = getModuleMastery(p, map, ["m"], today);
    expect(r.level).toBe("strong");
  });
});
