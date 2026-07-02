import { describe, it, expect } from "vitest";
import {
  clampInt,
  clampSurah,
  clampAyah,
  clampJuz,
  clampPage,
  isValidResourceId,
  isValidVerseKey,
  sanitizeSearchQuery,
} from "@/lib/validate";

// Migrated from scripts/verify-security.mjs (the validate half). The .mjs only
// regexed the source for the exported names; this exercises the REAL functions so
// a regression in a bound, a validator pattern, or the query sanitizer fails the
// suite. Bounds are never re-derived here — every range is asserted through the
// shipped clamp helper. These values bound every user-influenced number/string
// before it is interpolated into a Quran.com request URL.

describe("clampInt - core clamp", () => {
  it("returns an in-range integer unchanged", () => {
    expect(clampInt(5, 1, 10, 1)).toBe(5);
  });

  it("clamps below-range up to min and above-range down to max", () => {
    expect(clampInt(0, 1, 10, 1)).toBe(1);
    expect(clampInt(99, 1, 10, 1)).toBe(10);
  });

  it("floors a fractional value before bounding", () => {
    expect(clampInt(3.9, 1, 10, 1)).toBe(3);
  });

  it("falls back for a non-number or non-finite value", () => {
    expect(clampInt("7" as unknown as number, 1, 10, 2)).toBe(2);
    expect(clampInt(NaN, 1, 10, 2)).toBe(2);
    expect(clampInt(Infinity, 1, 10, 2)).toBe(2);
  });
});

describe("clampSurah - 1..114", () => {
  it("passes an in-range surah through", () => {
    expect(clampSurah(50)).toBe(50);
  });
  it("clamps below 1 up to 1 and above 114 down to 114", () => {
    expect(clampSurah(0)).toBe(1);
    expect(clampSurah(-5)).toBe(1);
    expect(clampSurah(200)).toBe(114);
  });
  it("falls back to 1 for a non-number", () => {
    expect(clampSurah("x")).toBe(1);
  });
});

describe("clampAyah - 1..286", () => {
  it("passes an in-range ayah and clamps the extremes", () => {
    expect(clampAyah(286)).toBe(286);
    expect(clampAyah(287)).toBe(286);
    expect(clampAyah(0)).toBe(1);
  });
});

describe("clampJuz - 1..30", () => {
  it("passes an in-range juz and clamps the extremes", () => {
    expect(clampJuz(15)).toBe(15);
    expect(clampJuz(30)).toBe(30);
    expect(clampJuz(31)).toBe(30);
    expect(clampJuz(0)).toBe(1);
  });
});

describe("clampPage - 1..604", () => {
  it("passes an in-range page and clamps the extremes", () => {
    expect(clampPage(300)).toBe(300);
    expect(clampPage(604)).toBe(604);
    expect(clampPage(605)).toBe(604);
    expect(clampPage(0)).toBe(1);
  });
});

describe("isValidResourceId", () => {
  it("accepts a small positive integer id", () => {
    expect(isValidResourceId(20)).toBe(true);
    expect(isValidResourceId(1)).toBe(true);
    expect(isValidResourceId(1_000_000)).toBe(true);
  });
  it("rejects zero, negatives, and out-of-range values", () => {
    expect(isValidResourceId(0)).toBe(false);
    expect(isValidResourceId(-1)).toBe(false);
    expect(isValidResourceId(1_000_001)).toBe(false);
  });
  it("rejects non-integers and non-numbers", () => {
    expect(isValidResourceId(1.5)).toBe(false);
    expect(isValidResourceId(NaN)).toBe(false);
    expect(isValidResourceId("20")).toBe(false);
    expect(isValidResourceId(null)).toBe(false);
  });
});

describe("isValidVerseKey - ^\\d{1,3}:\\d{1,3}$", () => {
  it("accepts a well-formed verse key", () => {
    expect(isValidVerseKey("2:255")).toBe(true);
    expect(isValidVerseKey("1:1")).toBe(true);
    expect(isValidVerseKey("114:6")).toBe(true);
  });
  it("rejects too-many-digit, malformed, and non-string keys", () => {
    expect(isValidVerseKey("2:2555")).toBe(false);
    expect(isValidVerseKey("2255:1")).toBe(false);
    expect(isValidVerseKey("2-255")).toBe(false);
    expect(isValidVerseKey("2:255 ")).toBe(false);
    expect(isValidVerseKey("abc")).toBe(false);
    expect(isValidVerseKey(255)).toBe(false);
  });
});

describe("sanitizeSearchQuery", () => {
  // Build control characters at runtime so the source carries no literal control
  // bytes: NUL/SOH (in-band) and DEL (edge) are all in the [\x00-\x1f\x7f] class
  // the sanitizer collapses to a single space.
  const NUL = String.fromCharCode(0);
  const SOH = String.fromCharCode(1);
  const DEL = String.fromCharCode(127);

  it("returns an empty string for a non-string value", () => {
    expect(sanitizeSearchQuery(42)).toBe("");
    expect(sanitizeSearchQuery(null)).toBe("");
  });

  it("passes a normal query through unchanged", () => {
    expect(sanitizeSearchQuery("noon sakinah")).toBe("noon sakinah");
  });

  it("collapses repeated whitespace and trims", () => {
    expect(sanitizeSearchQuery("  noon   sakinah  ")).toBe("noon sakinah");
  });

  it("strips control characters (collapsing a run to a single space)", () => {
    expect(sanitizeSearchQuery(`a${NUL}${SOH}b`)).toBe("a b");
    expect(sanitizeSearchQuery(`${DEL}hi${DEL}`)).toBe("hi");
  });

  it("preserves a hyphen (the strip is a control-char class, not a hyphen strip)", () => {
    expect(sanitizeSearchQuery("al-fatihah")).toBe("al-fatihah");
  });

  it("caps the query at 100 characters", () => {
    expect(sanitizeSearchQuery("a".repeat(200))).toHaveLength(100);
  });
});
