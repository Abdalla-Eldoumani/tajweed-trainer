import { describe, it, expect } from "vitest";
import { cn, formatSurahReference, toArabicIndic } from "@/lib/utils";

// New coverage for the small shared utilities.

describe("cn", () => {
  it("joins truthy class values and drops falsy ones", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("dedupes conflicting Tailwind classes, last one wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("merges conditional object and array forms", () => {
    expect(cn(["text-sm", { hidden: false, block: true }])).toBe("text-sm block");
  });
});

describe("toArabicIndic", () => {
  it("maps ASCII digits to Arabic-Indic numerals", () => {
    expect(toArabicIndic(1234567890)).toBe("١٢٣٤٥٦٧٨٩٠");
  });

  it("converts digits inside a mixed string and leaves separators", () => {
    expect(toArabicIndic("2:255")).toBe("٢:٢٥٥");
  });

  it("accepts a number and a string equivalently", () => {
    expect(toArabicIndic(5)).toBe(toArabicIndic("5"));
  });
});

describe("formatSurahReference", () => {
  it("defaults to English with ASCII numerals for a plain-string name", () => {
    expect(formatSurahReference("Al-Fatihah", 1, 1)).toBe("Al-Fatihah (1:1)");
  });

  it("uses the English name for an object name under the en locale", () => {
    expect(formatSurahReference({ en: "Al-Baqarah", ar: "البقرة" }, 2, 255, "en")).toBe(
      "Al-Baqarah (2:255)",
    );
  });

  it("uses the Arabic name and Arabic-Indic numerals under the ar locale", () => {
    expect(formatSurahReference({ en: "Al-Baqarah", ar: "البقرة" }, 2, 255, "ar")).toBe(
      "البقرة (٢:٢٥٥)",
    );
  });

  it("falls back to the English name under ar when no Arabic name is given", () => {
    expect(formatSurahReference({ en: "Al-Fatihah" }, 1, 1, "ar")).toBe("Al-Fatihah (١:١)");
  });
});
