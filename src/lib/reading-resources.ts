import type { TranslationResource } from "./types";

// A small, conservative set of well-established Quran.com Foundation API v4
// resource ids so the reading-depth selectors are usable offline. The full
// catalogue is merged in from /resources/* when online (and those names win).
// These are catalogue identifiers only — the translation and tafsir TEXT is
// always fetched from the API by id, never generated here. Ids omitted where
// uncertain, per the source-everything rule.

export const CURATED_TRANSLATIONS: TranslationResource[] = [
  { id: 131, name: "The Clear Quran — Dr. Mustafa Khattab", authorName: "Mustafa Khattab", languageName: "english" },
  { id: 20, name: "Saheeh International", authorName: "Saheeh International", languageName: "english" },
];

export const CURATED_TAFSIRS: TranslationResource[] = [
  { id: 169, name: "Tafsir Ibn Kathir (abridged)", authorName: "Ibn Kathir", languageName: "english" },
];

// Merge curated and fetched resources by id; fetched (API) names take precedence.
export function mergeResources(
  curated: TranslationResource[],
  fetched: TranslationResource[],
): TranslationResource[] {
  const byId = new Map<number, TranslationResource>();
  for (const r of curated) byId.set(r.id, r);
  for (const r of fetched) byId.set(r.id, r);
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}
