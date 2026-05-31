// Read-only access to the pre-fetched tajweed snapshots in
// src/data/verse-snapshots.json. The data is authenticated Quran.com API output
// captured by scripts/prefetch-tajweed-snapshots.mjs; nothing here generates or
// edits verse text. Safe to import from server or client (static JSON, no fetch).

import snapshots from "@/data/verse-snapshots.json";
import type { VerseSnapshot } from "@/lib/types";

const SNAPSHOTS = snapshots as Record<string, VerseSnapshot>;

export function getVerseSnapshot(surah: number, ayah: number): VerseSnapshot | undefined {
  return SNAPSHOTS[`${surah}:${ayah}`];
}

export function getVerseSnapshotByKey(verseKey: string): VerseSnapshot | undefined {
  return SNAPSHOTS[verseKey];
}
