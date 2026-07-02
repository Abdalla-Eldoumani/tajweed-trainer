import { describe, it, expect } from "vitest";
import { getVerseSnapshot, getVerseSnapshotByKey } from "@/lib/verse-snapshots";
import ghunnah from "@/data/content/ghunnah.json";
import laamRaa from "@/data/content/laam-raa-rules.json";
import madd from "@/data/content/madd-rules.json";
import makharij from "@/data/content/makharij.json";
import meemSakinah from "@/data/content/meem-sakinah.json";
import noonSakinah from "@/data/content/noon-sakinah-tanween.json";
import qalqalah from "@/data/content/qalqalah.json";
import tafkheem from "@/data/content/tafkheem-tarqeeq.json";
import waqf from "@/data/content/waqf-symbols.json";

// Ported data half of scripts/verify-lesson-coloring.mjs: every surah:ayah cited
// by the lesson content has a non-empty tajweed snapshot that carries real
// <tajweed> markup, so lesson coloring can render offline. This imports the REAL
// snapshot reader and the SAME content JSON the source script walks. It asserts
// snapshot PRESENCE and MARKUP only — never the verse text itself (content is
// immutable; real-verse membership stays a WARN in the .mjs and is not promoted
// to a hard fail here). The component-source halves (ExampleCard renders
// TajweedText; ColorLegend reads the map) stay in the kept .mjs.
//
// This is the every-example-bearing content file (the script reads the content
// dir minus surah-index.json and learning-path.json, which cite no example
// verses). Keep this list in step with src/data/content when a lesson file is
// added.
const CONTENT: unknown[] = [
  ghunnah,
  laamRaa,
  madd,
  makharij,
  meemSakinah,
  noonSakinah,
  qalqalah,
  tafkheem,
  waqf,
];

function collectKeys(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, out);
    return;
  }
  if (node && typeof node === "object") {
    const rec = node as Record<string, unknown>;
    if (typeof rec.surah === "number" && typeof rec.ayah === "number") {
      out.add(`${rec.surah}:${rec.ayah}`);
    }
    for (const value of Object.values(rec)) collectKeys(value, out);
  }
}

const citedKeys = (() => {
  const keys = new Set<string>();
  for (const file of CONTENT) collectKeys(file, keys);
  return [...keys];
})();

describe("lesson-coloring snapshot coverage", () => {
  it("the lesson content cites verses to snapshot", () => {
    expect(citedKeys.length).toBeGreaterThan(0);
  });

  it("every cited lesson verse has a non-empty tajweed snapshot with real <tajweed> markup", () => {
    const problems: string[] = [];
    for (const key of citedKeys) {
      const snap = getVerseSnapshotByKey(key);
      if (!snap || typeof snap.tajweedHtml !== "string" || snap.tajweedHtml.length === 0) {
        problems.push(`${key} (missing/empty)`);
        continue;
      }
      if (!/<tajweed\b/.test(snap.tajweedHtml)) problems.push(`${key} (no <tajweed> markup)`);
    }
    expect(problems, problems.join(", ")).toEqual([]);
  });

  it("getVerseSnapshot(surah, ayah) matches getVerseSnapshotByKey for a cited verse", () => {
    const [surahStr, ayahStr] = citedKeys[0].split(":");
    expect(getVerseSnapshot(Number(surahStr), Number(ayahStr))).toBe(getVerseSnapshotByKey(citedKeys[0]));
  });
});
