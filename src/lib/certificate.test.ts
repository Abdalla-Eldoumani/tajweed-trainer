import { describe, it, expect } from "vitest";
import { getCompletedJuz, isKhatmahComplete } from "@/lib/certificate";
import { versesForJuz } from "@/lib/navigation";
import type { KhatmahPlan } from "@/lib/types";

// Migrated from scripts/verify-certificate.mjs (the pure completion half).
// certificate.ts imports memorization-scope -> navigation via the "@/" alias, so
// it could not load under bare Node; under Vite's alias it loads and these call
// the REAL getCompletedJuz / isKhatmahComplete. The canvas render/export half is
// deferred to the browser phase (jsdom implements no 2D canvas), so only the
// pure completion math is asserted here. The real versesForJuz builds the
// fixtures; the completion logic is never re-derived.

const plan = (over: Partial<KhatmahPlan> = {}): KhatmahPlan => ({
  startDate: "2026-06-01",
  targetDate: "2026-06-30",
  startPage: 1,
  ...over,
});

describe("getCompletedJuz - a juz counts only when fully memorized", () => {
  it("an empty memorized set completes nothing", () => {
    expect(getCompletedJuz(new Set())).toEqual([]);
  });

  it("all of juz 30 memorized returns [30] and nothing else", () => {
    const done = getCompletedJuz(new Set(versesForJuz(30)));
    expect(done).toEqual([30]);
  });

  it("juz 30 minus one verse is NOT complete", () => {
    const minusOne = new Set(versesForJuz(30).slice(1)); // drop the first verse
    expect(getCompletedJuz(minusOne)).not.toContain(30);
  });

  it("a union of full juz 1 and juz 30 returns both", () => {
    const union = new Set([...versesForJuz(1), ...versesForJuz(30)]);
    const done = getCompletedJuz(union);
    expect(done).toContain(1);
    expect(done).toContain(30);
  });
});

describe("isKhatmahComplete - passes through the pace model's finish flag", () => {
  it("is true once the reader reaches the final mushaf page (604)", () => {
    expect(isKhatmahComplete(plan(), 604, "2026-06-29")).toBe(true);
  });

  it("is false partway through (page 300)", () => {
    expect(isKhatmahComplete(plan(), 300, "2026-06-15")).toBe(false);
  });
});
