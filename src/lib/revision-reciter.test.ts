import { describe, it, expect } from "vitest";
import type { UserSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/storage";
import { resolveRevisionReciter } from "@/lib/revision-reciter";

// The single `revisionReciter ?? reciter` derivation the four revision surfaces
// consume. Pure: it reads only two already-sanitized settings
// fields, so a valid stored value can only be a known reciter id.
describe("resolveRevisionReciter: revisionReciter ?? reciter", () => {
  const withReciters = (reciter: string, revisionReciter?: string): UserSettings => ({
    ...DEFAULT_SETTINGS,
    reciter,
    revisionReciter,
  });

  it("returns the revisionReciter when it is set (override honored)", () => {
    expect(resolveRevisionReciter(withReciters("12", "7"))).toBe("7");
  });

  it("falls back to the browse reciter when revisionReciter is undefined", () => {
    expect(resolveRevisionReciter(withReciters("12", undefined))).toBe("12");
  });

  it("falls back to an EveryAyah browse reciter when revisionReciter is unset", () => {
    expect(resolveRevisionReciter(withReciters("ea-ghamdi"))).toBe("ea-ghamdi");
  });
});
