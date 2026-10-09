import { describe, it, expect } from "vitest";
import { stripArabicDiacritics, wordsMatch } from "@/lib/word-compare";

// The worked-value matrix. Every case asserts against the REAL
// word-compare exports. The expected outputs are literal strings checked
// against the real captured Uthmani word data and Unicode
// General_Category; they are never re-derived from the function under test.
//
// The strip removes ONLY Unicode general-category Mn (nonspacing combining marks).
// The human-readable equivalent of `\p{Mn}` for Quranic Uthmani text is the code
// point set: U+0610-U+061A, U+064B-U+065F, U+0670, U+06D6-U+06DC, U+06DF-U+06E4,
// U+06E7-U+06E8, U+06EA-U+06ED (every one is category Mn; a `\p{Mn}` + `u` regex
// is the maintainable form of that class). Base letters, hamza seats, alef-wasla
// U+0671 (Lo), and tatweel U+0640 (Lm) are NOT Mn and are left intact.

describe("stripArabicDiacritics - removes combining marks, never folds letters", () => {
  it("removes the harakat but keeps the alef-wasla U+0671", () => {
    // "ٱلرَّحِيمِ" (shadda 0651, fatha 064E, kasra 0650 x2) -> "ٱلرحيم"
    expect(stripArabicDiacritics("ٱلرَّحِيمِ")).toBe("ٱلرحيم");
  });

  // NFD-trap regression: NFC (not NFD) keeps the precomposed alef-madda آ U+0622.
  // NFD would decompose آ into bare alef + combining madda (Mn), and the strip
  // would then FOLD it, returning the WRONG "امنوا". The impl MUST be NFC.
  it("does NOT fold alef-madda آ U+0622 (the NFD trap)", () => {
    // "آمَنُوا" (fatha 064E, damma 064F) -> "آمنوا"; NFD would give "امنوا".
    expect(stripArabicDiacritics("آمَنُوا")).toBe("آمنوا");
  });

  it("leaves a word with no combining marks unchanged", () => {
    // "الله" carries no Mn, so nothing is removed.
    expect(stripArabicDiacritics("الله")).toBe("الله");
  });

  it("removes the dagger alef but keeps the tatweel U+0640 as an orphan carrier", () => {
    // "ٱلرَّحْمَـٰنِ" -> "ٱلرحمـن": shadda/fatha/sukun/fatha/dagger-alef(0670)/kasra
    // are stripped; alef-wasla ٱ and the tatweel ـ (Lm, not Mn) are kept.
    expect(stripArabicDiacritics("ٱلرَّحْمَـٰنِ")).toBe("ٱلرحمـن");
  });
});

describe("wordsMatch - exact by default, diacritic-insensitive is opt-in", () => {
  it("matches a marks-only-different pair ONLY in diacritic-insensitive mode", () => {
    // Learner typed the bare skeleton; stored carries the harakat.
    expect(
      wordsMatch("ٱلرحيم", "ٱلرَّحِيمِ", { diacriticInsensitive: true }),
    ).toBe(true);
  });

  it("rejects a marks-only-different pair in exact mode", () => {
    expect(
      wordsMatch("ٱلرحيم", "ٱلرَّحِيمِ", { diacriticInsensitive: false }),
    ).toBe(false);
  });

  it("trims both sides and defaults to exact match", () => {
    // Surrounding whitespace is trimmed; default opts = { diacriticInsensitive: false }.
    expect(wordsMatch("  ٱلرَّحِيمِ  ", "ٱلرَّحِيمِ")).toBe(true);
  });

  it("matches an identical no-marks pair in BOTH modes", () => {
    expect(wordsMatch("الله", "الله")).toBe(true);
    expect(wordsMatch("الله", "الله", { diacriticInsensitive: false })).toBe(true);
    expect(wordsMatch("الله", "الله", { diacriticInsensitive: true })).toBe(true);
  });

  it("does not mutate either argument's source string", () => {
    const typed = "  ٱلرَّحِيمِ  ";
    const stored = "ٱلرَّحِيمِ";
    wordsMatch(typed, stored, { diacriticInsensitive: true });
    // Strings are immutable in JS, but this pins the read-only contract:
    // the comparison strips COPIES; the sources are untouched.
    expect(typed).toBe("  ٱلرَّحِيمِ  ");
    expect(stored).toBe("ٱلرَّحِيمِ");
  });
});
