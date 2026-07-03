import { describe, it, expect } from "vitest";
import { getMissedByModule } from "@/lib/weak-rules";
import type { ReviewState, TajweedProgress } from "@/lib/types";

// Migrated from scripts/verify-weak-rules.mjs. These call the REAL
// getMissedByModule so a regression in the miss attribution or the ranking math
// fails the suite; no arithmetic is re-derived here. The question-to-module map
// and module-id order are passed as arguments (the function takes them so it
// stays content/storage free).

const today = "2026-06-21";

// getMissedByModule reads only `reviews`; the rest of the TajweedProgress shape
// is irrelevant, so a minimal object is asserted into the full type.
type ProgressStub = Pick<TajweedProgress, "modules" | "reviews">;
const progress = (p: ProgressStub): TajweedProgress => p as TajweedProgress;

// Only the counters matter; box/dates are filler ReviewState shape.
const rev = (seen: number, correct: number): ReviewState => ({
  box: 1,
  nextDueDate: "",
  lastSeenDate: "",
  timesSeen: seen,
  timesCorrect: correct,
});

const empty = progress({ modules: {}, reviews: {} });

describe("getMissedByModule - empty history", () => {
  it("every requested module row is missed 0 / seen 0", () => {
    const rows = getMissedByModule(empty, {}, ["makharij", "ghunnah"], today);
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.missed).toBe(0);
      expect(r.seen).toBe(0);
    }
  });
});

describe("getMissedByModule - miss attribution", () => {
  it("missed = seen - correct (seen 5 / correct 2 -> missed 3, seen 5)", () => {
    const [r] = getMissedByModule(
      progress({ modules: {}, reviews: { q1: rev(5, 2) } }),
      { q1: "makharij" },
      ["makharij"],
      today,
    );
    expect(r.missed).toBe(3);
    expect(r.seen).toBe(5);
  });

  it("two questions in the same module sum their misses and their seen counts", () => {
    // misses 3 + 3 = 6, seen 5 + 4 = 9
    const [r] = getMissedByModule(
      progress({ modules: {}, reviews: { q1: rev(5, 2), q2: rev(4, 1) } }),
      { q1: "makharij", q2: "makharij" },
      ["makharij"],
      today,
    );
    expect(r.missed).toBe(6);
    expect(r.seen).toBe(9);
  });

  it("an unmapped questionId is ignored", () => {
    // qX has no module in the map -> dropped from the aggregation.
    const [r] = getMissedByModule(
      progress({ modules: {}, reviews: { q1: rev(5, 2), qX: rev(9, 0) } }),
      { q1: "makharij" },
      ["makharij"],
      today,
    );
    expect(r.missed).toBe(3);
    expect(r.seen).toBe(5);
  });
});

describe("getMissedByModule - ranking", () => {
  it("most-missed first, and an unseen module sorts last", () => {
    // ghunnah missed 3, qalqalah missed 9; makharij has no reviews (seen 0).
    const rows = getMissedByModule(
      progress({ modules: {}, reviews: { q1: rev(3, 0), q2: rev(9, 0) } }),
      { q1: "ghunnah", q2: "qalqalah" },
      ["makharij", "ghunnah", "qalqalah"],
      today,
    );
    expect(rows.map((r) => r.moduleId)).toEqual(["qalqalah", "ghunnah", "makharij"]);
  });

  it("landmine: a tie on misses breaks by the input moduleIds order (stable)", () => {
    // both modules missed 3; makharij precedes ghunnah in the id list.
    const rows = getMissedByModule(
      progress({ modules: {}, reviews: { q1: rev(4, 1), q2: rev(4, 1) } }),
      { q1: "ghunnah", q2: "makharij" },
      ["makharij", "ghunnah"],
      today,
    );
    expect(rows.map((r) => r.moduleId)).toEqual(["makharij", "ghunnah"]);
  });

  it("the same tie flips when the moduleIds order flips (proves it is the tie-break)", () => {
    const rows = getMissedByModule(
      progress({ modules: {}, reviews: { q1: rev(4, 1), q2: rev(4, 1) } }),
      { q1: "ghunnah", q2: "makharij" },
      ["ghunnah", "makharij"],
      today,
    );
    expect(rows.map((r) => r.moduleId)).toEqual(["ghunnah", "makharij"]);
  });
});

describe("getMissedByModule - malformed counts", () => {
  it("correct > seen clamps missed to 0 (never negative)", () => {
    const [r] = getMissedByModule(
      progress({ modules: {}, reviews: { q1: rev(2, 5) } }),
      { q1: "makharij" },
      ["makharij"],
      today,
    );
    expect(r.missed).toBe(0);
  });
});
