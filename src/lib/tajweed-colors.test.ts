import { describe, it, expect } from "vitest";
import {
  getColorForClass,
  getColorsByGroup,
  TAJWEED_COLORS,
  TAJWEED_GROUP_ORDER,
} from "@/lib/tajweed-colors";

// Coverage for the tajweed color resolver, imported REAL. This asserts the
// resolution and grouping structure only: a known class and a legacy alias
// resolve, an unknown class does not, and getColorsByGroup buckets every color
// under a known group. It deliberately asserts NO hex value — the QUL light-hex
// and dark-contrast parity is the WARN-split audit in verify-tajweed-colors.mjs
// and must not be duplicated (or promoted to a hard fail) here.

describe("getColorForClass", () => {
  it("resolves a known class to a fully-shaped TajweedColor", () => {
    const c = getColorForClass("ghunnah");
    expect(c).toBeDefined();
    expect(c!.cssClass).toBe("ghunnah");
    expect(c!.nameEn).toBeTruthy();
    expect(c!.nameAr).toBeTruthy();
    expect(TAJWEED_GROUP_ORDER).toContain(c!.group);
    expect(typeof c!.light).toBe("string");
    expect(typeof c!.dark).toBe("string");
  });

  it("resolves a legacy alias to its canonical class", () => {
    // CLASS_ALIASES maps old names to the current keys; a caller passing a legacy
    // name still resolves to the right color.
    expect(getColorForClass("qalqalah")?.cssClass).toBe("qalaqah");
    expect(getColorForClass("ikhfaa")?.cssClass).toBe("ikhafa");
    expect(getColorForClass("idgham_no_ghunnah")?.cssClass).toBe("idgham_wo_ghunnah");
    expect(getColorForClass("silent")?.cssClass).toBe("slnt");
  });

  it("returns undefined for an unknown class", () => {
    expect(getColorForClass("not_a_tajweed_class")).toBeUndefined();
  });
});

describe("getColorsByGroup", () => {
  it("returns a bucket for exactly every group in TAJWEED_GROUP_ORDER", () => {
    const groups = getColorsByGroup();
    expect(Object.keys(groups).sort()).toEqual([...TAJWEED_GROUP_ORDER].sort());
  });

  it("places every color under its own group and drops none", () => {
    const groups = getColorsByGroup();
    const total = Object.values(groups).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(TAJWEED_COLORS.length);
    for (const color of TAJWEED_COLORS) {
      expect(groups[color.group], color.cssClass).toContainEqual(color);
    }
  });
});
