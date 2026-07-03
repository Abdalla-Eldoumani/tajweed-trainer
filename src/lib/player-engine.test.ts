import { describe, it, expect } from "vitest";
import {
  buildRangeQueue,
  dedupeQueue,
  nextAfterEnded,
  repeatOneJustCompleted,
  type EndedSnapshot,
} from "@/lib/player-engine";

// Migrated from scripts/verify-player-engine.mjs. These call the REAL exported
// functions so a regression in player-engine.ts fails the suite; the arithmetic
// is never re-derived here (that was the point of the migration). The two
// invariant tests drive the real nextAfterEnded in a loop and count plays -
// they exercise the shipped engine, they do not re-implement it.

// A snapshot fixture builder so each case states only the fields that matter.
// This is test data, not engine logic.
function snap(over: Partial<EndedSnapshot> = {}): EndedSnapshot {
  return {
    repeatOne: 0,
    repeatsDone: 0,
    repeatRange: null,
    rangeLoopsDone: 0,
    loopSelection: false,
    mode: "single",
    index: 0,
    queueLength: 1,
    currentAyah: 1,
    sleepEndOfSurah: false,
    ...over,
  };
}

describe("buildRangeQueue", () => {
  it("builds a forward inclusive range", () => {
    expect(buildRangeQueue(2, 3, 5)).toEqual([
      { surah: 2, ayah: 3 },
      { surah: 2, ayah: 4 },
      { surah: 2, ayah: 5 },
    ]);
  });

  it("normalizes a reversed range", () => {
    expect(buildRangeQueue(2, 5, 3)).toEqual([
      { surah: 2, ayah: 3 },
      { surah: 2, ayah: 4 },
      { surah: 2, ayah: 5 },
    ]);
  });

  it("yields a single-item queue when from === to", () => {
    expect(buildRangeQueue(2, 7, 7)).toEqual([{ surah: 2, ayah: 7 }]);
  });

  it("clamps sub-1 bounds to 1", () => {
    expect(buildRangeQueue(2, 0, 1)).toEqual([{ surah: 2, ayah: 1 }]);
  });
});

describe("dedupeQueue", () => {
  it("keeps first-occurrence order and drops a repeat", () => {
    expect(
      dedupeQueue([
        { surah: 2, ayah: 5 },
        { surah: 1, ayah: 1 },
        { surah: 2, ayah: 5 },
        { surah: 3, ayah: 9 },
      ]),
    ).toEqual([
      { surah: 2, ayah: 5 },
      { surah: 1, ayah: 1 },
      { surah: 3, ayah: 9 },
    ]);
  });
});

describe("nextAfterEnded - repeatOne", () => {
  it("repeats the current ayah mid-count", () => {
    expect(nextAfterEnded(snap({ repeatOne: 3, repeatsDone: 0 }))).toEqual({
      kind: "repeat-one",
    });
  });

  it("falls through to stop on its last play", () => {
    expect(nextAfterEnded(snap({ repeatOne: 3, repeatsDone: 2 })).kind).toBe("stop");
  });
});

describe("nextAfterEnded - repeatRange", () => {
  it("walks forward inside the range", () => {
    expect(
      nextAfterEnded(
        snap({
          repeatRange: { from: 1, to: 3, count: 2 },
          mode: "continuous",
          index: 0,
          queueLength: 6,
          currentAyah: 1,
        }),
      ),
    ).toEqual({ kind: "advance", index: 1 });
  });

  it("loops back to the range start when more loops remain", () => {
    expect(
      nextAfterEnded(
        snap({
          repeatRange: { from: 1, to: 3, count: 2 },
          rangeLoopsDone: 0,
          mode: "continuous",
          index: 2,
          queueLength: 6,
          currentAyah: 3,
        }),
      ),
    ).toEqual({ kind: "loop-range", index: 0 });
  });

  it("stops (idle) once the loop count is exhausted", () => {
    expect(
      nextAfterEnded(
        snap({
          repeatRange: { from: 1, to: 3, count: 2 },
          rangeLoopsDone: 1,
          mode: "continuous",
          index: 2,
          queueLength: 6,
          currentAyah: 3,
        }),
      ),
    ).toEqual({ kind: "stop", status: "idle" });
  });

  it("totals span x count plays walked through the real decision", () => {
    const from = 2;
    const to = 4;
    const count = 3;
    const queueLength = 6;
    let index = from - 1;
    let rangeLoopsDone = 0;
    let plays = 0;
    for (let guard = 0; guard < 100; guard++) {
      plays++;
      const d = nextAfterEnded(
        snap({
          repeatRange: { from, to, count },
          rangeLoopsDone,
          mode: "continuous",
          index,
          queueLength,
          currentAyah: index + 1,
        }),
      );
      if (d.kind === "stop") break;
      if (d.kind === "loop-range") rangeLoopsDone++;
      if ("index" in d) index = d.index;
    }
    expect(plays).toBe((to - from + 1) * count);
  });
});

describe("nextAfterEnded - loopSelection", () => {
  it("wraps to index 0 at the last index", () => {
    expect(
      nextAfterEnded(
        snap({ loopSelection: true, mode: "continuous", index: 2, queueLength: 3, currentAyah: 99 }),
      ),
    ).toEqual({ kind: "loop-selection", index: 0 });
  });

  it("advances to index+1 mid-queue", () => {
    expect(
      nextAfterEnded(snap({ loopSelection: true, mode: "continuous", index: 0, queueLength: 3 })),
    ).toEqual({ kind: "advance", index: 1 });
  });

  it("ignores ayah numbers and loops a non-contiguous set by index", () => {
    expect(
      nextAfterEnded(
        snap({ loopSelection: true, mode: "continuous", index: 2, queueLength: 3, currentAyah: 1 }),
      ),
    ).toEqual({ kind: "loop-selection", index: 0 });
  });

  it("totals N x C plays for an N-item selection looped C times", () => {
    const N = 4;
    const C = 3;
    let index = 0;
    let loops = 0;
    let plays = 0;
    for (let guard = 0; guard < 100; guard++) {
      plays++;
      const d = nextAfterEnded(
        snap({ loopSelection: loops + 1 < C, mode: "continuous", index, queueLength: N }),
      );
      if (d.kind === "stop") break;
      if (d.kind === "loop-selection") loops++;
      if ("index" in d) index = d.index;
    }
    expect(plays).toBe(N * C);
  });
});

describe("nextAfterEnded - default paths", () => {
  it("single at end returns to paused", () => {
    expect(nextAfterEnded(snap({ mode: "single", index: 0, queueLength: 1 }))).toEqual({
      kind: "stop",
      status: "paused",
    });
  });

  it("continuous at end goes idle", () => {
    expect(nextAfterEnded(snap({ mode: "continuous", index: 2, queueLength: 3 }))).toEqual({
      kind: "stop",
      status: "idle",
    });
  });

  it("continuous mid-queue advances", () => {
    expect(nextAfterEnded(snap({ mode: "continuous", index: 0, queueLength: 3 }))).toEqual({
      kind: "advance",
      index: 1,
    });
  });

  it("sleepEndOfSurah halts continuous auto-advance", () => {
    expect(
      nextAfterEnded(snap({ mode: "continuous", index: 0, queueLength: 3, sleepEndOfSurah: true })),
    ).toEqual({ kind: "stop", status: "idle" });
  });
});

describe("repeatOneJustCompleted", () => {
  it("is true on the terminal stop of a repeat-one loop (N>=2)", () => {
    const s = snap({ repeatOne: 3, repeatsDone: 2 });
    expect(repeatOneJustCompleted(s, nextAfterEnded(s))).toBe(true);
  });

  it("is true for a target of 1 (single listen, no loop-backs)", () => {
    const s = snap({ repeatOne: 1, repeatsDone: 0 });
    expect(repeatOneJustCompleted(s, nextAfterEnded(s))).toBe(true);
  });

  it("is false mid-loop (still repeating)", () => {
    const s = snap({ repeatOne: 3, repeatsDone: 0 });
    expect(repeatOneJustCompleted(s, nextAfterEnded(s))).toBe(false);
  });

  it("is false for a plain single verse with no repeat armed", () => {
    const s = snap({ repeatOne: 0, mode: "single", index: 0, queueLength: 1 });
    expect(repeatOneJustCompleted(s, nextAfterEnded(s))).toBe(false);
  });

  it("counts exactly N terminal completions across N re-armed loops", () => {
    // Drive the real decision for a target-N loop and count how many times the
    // completion fires: exactly once, on the last play (repeatsDone N-1 -> stop).
    const N = 5;
    let repeatsDone = 0;
    let completions = 0;
    for (let guard = 0; guard < 100; guard++) {
      const s = snap({ repeatOne: N, repeatsDone });
      const d = nextAfterEnded(s);
      if (repeatOneJustCompleted(s, d)) completions++;
      if (d.kind === "stop") break;
      if (d.kind === "repeat-one") repeatsDone++;
    }
    expect(completions).toBe(1);
    // The loop-backs (repeatsDone) top out at N-1; the completion signal supplies
    // the missing final listen, so loop-backs + completion == the true N.
    expect(repeatsDone + completions).toBe(N);
  });
});

describe("nextAfterEnded - precedence landmines", () => {
  it("repeatOne wins over loopSelection", () => {
    expect(
      nextAfterEnded(
        snap({ repeatOne: 2, repeatsDone: 0, loopSelection: true, queueLength: 3 }),
      ).kind,
    ).toBe("repeat-one");
  });

  it("repeatRange wins over loopSelection", () => {
    expect(
      nextAfterEnded(
        snap({
          repeatRange: { from: 1, to: 3, count: 2 },
          loopSelection: true,
          mode: "continuous",
          index: 0,
          queueLength: 6,
          currentAyah: 1,
        }),
      ),
    ).toEqual({ kind: "advance", index: 1 });
  });
});
