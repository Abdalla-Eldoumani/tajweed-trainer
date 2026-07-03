import { describe, it, expect, beforeEach } from "vitest";
import { usePlayer } from "@/hooks/usePlayer";

// The store's onEnded replays the pure player-engine decision; this asserts the
// ONE piece of state the store adds on top of that replay: repeatOneCompletions,
// bumped exactly once when a repeat-one loop plays through its terminal listen.
// TikrarDrill reads it to count that final listen (repeatsDone counts only
// loop-backs and tops out at target-1). onEnded also persists the resume record;
// jsdom's localStorage makes that write a safe no-op here.

function seed(over: Record<string, unknown>) {
  usePlayer.setState({
    queue: [{ surah: 1, ayah: 1 }],
    index: 0,
    mode: "single",
    repeatOne: 0,
    repeatsDone: 0,
    repeatOneCompletions: 0,
    repeatRange: null,
    rangeLoopsDone: 0,
    loopSelection: false,
    ...over,
  });
}

describe("usePlayer.onEnded — repeatOneCompletions", () => {
  beforeEach(() => seed({}));

  it("bumps once on the terminal listen of a repeat-one loop", () => {
    seed({ repeatOne: 3, repeatsDone: 2 });
    usePlayer.getState().onEnded();
    expect(usePlayer.getState().repeatOneCompletions).toBe(1);
  });

  it("bumps for a target of 1 (single listen, no loop-backs)", () => {
    seed({ repeatOne: 1, repeatsDone: 0 });
    usePlayer.getState().onEnded();
    expect(usePlayer.getState().repeatOneCompletions).toBe(1);
  });

  it("does not bump mid-loop (still repeating)", () => {
    seed({ repeatOne: 3, repeatsDone: 0 });
    usePlayer.getState().onEnded();
    expect(usePlayer.getState().repeatOneCompletions).toBe(0);
  });

  it("does not bump for a plain single verse with no repeat armed", () => {
    seed({ repeatOne: 0, repeatsDone: 0 });
    usePlayer.getState().onEnded();
    expect(usePlayer.getState().repeatOneCompletions).toBe(0);
  });

  it("loop-backs + one completion total the true target across a driven loop", () => {
    const N = 4;
    seed({ repeatOne: N, repeatsDone: 0 });
    let loopBacks = 0;
    for (let guard = 0; guard < 50; guard++) {
      const before = usePlayer.getState().repeatsDone;
      usePlayer.getState().onEnded();
      const after = usePlayer.getState();
      if (after.status === "paused") break; // terminal stop for single mode
      if (after.repeatsDone === before + 1) loopBacks++;
    }
    const s = usePlayer.getState();
    expect(loopBacks).toBe(N - 1);
    expect(s.repeatOneCompletions).toBe(1);
    expect(loopBacks + s.repeatOneCompletions).toBe(N);
  });
});
