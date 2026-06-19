import type { ReciterId } from "./types";
import { DEFAULT_RECITER_ID, EVERYAYAH_FOLDER, isEveryAyahReciter, normalizeReciterId } from "./reciters";
import { toSafeAudioUrl } from "./media-url";
import { clampSurah, clampAyah } from "./validate";

// Quran.com per-ayah audio. The by_ayah endpoint returns a path relative to the
// audio CDN; prefix it with AUDIO_CDN to get the playable file URL.
const QURAN_API = "https://api.quran.com/api/v4";
const AUDIO_CDN = "https://verses.quran.com/";

// EveryAyah serves per-ayah files at a deterministic path (no API): the surah
// and ayah are each zero-padded to three digits, e.g. 1:1 -> 001001.mp3.
const EVERYAYAH_BASE = "https://everyayah.com/data/";

const audioCache = new Map<string, { url: string; timestamp: number }>();
const AUDIO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Word-level timing for one verse, from the Quran.com v4 audio API. Each entry
// is [wordStartIndex, wordEndIndexExclusive, startMs, endMs], timing metadata
// about the verified recitation audio, not generated content. Most Quran.com
// reciters expose it; the EveryAyah reciters and a few Quran.com ones do not,
// in which case there is simply no highlight.
export type WordSegment = [number, number, number, number];

const segmentCache = new Map<string, { segments: WordSegment[] | null; timestamp: number }>();

// Zero-pad a 1-3 digit number to three digits for the EveryAyah file name.
function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

// Self-clamp the division so the endpoint is well-formed regardless of caller.
export function getAudioEndpoint(surah: number, ayah: number, reciter: ReciterId = DEFAULT_RECITER_ID): string {
  return `${QURAN_API}/recitations/${normalizeReciterId(reciter)}/by_ayah/${clampSurah(surah)}:${clampAyah(ayah)}`;
}

// Build the deterministic EveryAyah file URL for a reciter folder and verse.
export function getEveryAyahUrl(folder: string, surah: number, ayah: number): string {
  return `${EVERYAYAH_BASE}${folder}/${pad3(clampSurah(surah))}${pad3(clampAyah(ayah))}.mp3`;
}

export async function fetchAudioUrl(
  surah: number,
  ayah: number,
  reciter: ReciterId = DEFAULT_RECITER_ID,
): Promise<string> {
  const id = normalizeReciterId(reciter);
  const cacheKey = `${surah}:${ayah}:${id}`;
  const cached = audioCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AUDIO_CACHE_TTL) {
    return cached.url;
  }

  // EveryAyah reciters: the file path is deterministic, so construct the URL
  // directly without an API round-trip. Still gate it through the host
  // allowlist (the path is an absolute URL, so no CDN base is needed).
  if (isEveryAyahReciter(id)) {
    const folder = EVERYAYAH_FOLDER[id];
    const everyAyahUrl = toSafeAudioUrl(getEveryAyahUrl(folder, surah, ayah), "");
    if (!everyAyahUrl) {
      throw new Error("Could not build a valid audio URL for this reciter");
    }
    audioCache.set(cacheKey, { url: everyAyahUrl, timestamp: Date.now() });
    return everyAyahUrl;
  }

  const response = await fetch(getAudioEndpoint(surah, ayah, id));
  if (!response.ok) {
    throw new Error(`Audio API error: ${response.status}`);
  }
  const data = await response.json();
  const path = data?.audio_files?.[0]?.url;
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("Audio API returned no file for this verse");
  }
  const audioUrl = toSafeAudioUrl(path, AUDIO_CDN);
  if (!audioUrl) {
    throw new Error("Audio API returned a URL from an unexpected origin");
  }

  audioCache.set(cacheKey, { url: audioUrl, timestamp: Date.now() });
  return audioUrl;
}

// Fetch the word-by-word timing for a verse and reciter, or null when none is
// available (EveryAyah reciters, reciters without segments, or any failure).
// Cached per verse and reciter alongside the audio URL. Never throws: a
// missing or malformed payload degrades silently to no highlight.
export async function fetchSegments(
  surah: number,
  ayah: number,
  reciter: ReciterId = DEFAULT_RECITER_ID,
): Promise<WordSegment[] | null> {
  const id = normalizeReciterId(reciter);
  // EveryAyah files are plain mp3s with no Quran.com timing data.
  if (isEveryAyahReciter(id)) return null;

  const cacheKey = `${surah}:${ayah}:${id}`;
  const cached = segmentCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AUDIO_CACHE_TTL) {
    return cached.segments;
  }

  let segments: WordSegment[] | null = null;
  try {
    const url = `${QURAN_API}/verses/by_key/${clampSurah(surah)}:${clampAyah(ayah)}?audio=${encodeURIComponent(id)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const raw = data?.verse?.audio?.segments;
      if (Array.isArray(raw)) {
        const parsed = raw
          .filter((s: unknown) => Array.isArray(s) && s.length >= 4 && s.every((n) => typeof n === "number"))
          .map((s: number[]) => [s[0], s[1], s[2], s[3]] as WordSegment);
        if (parsed.length) segments = parsed;
      }
    }
  } catch {
    segments = null;
  }

  segmentCache.set(cacheKey, { segments, timestamp: Date.now() });
  return segments;
}

// The 0-based index of the word active at time `ms`, or -1 if none. Segments
// are ordered; a small lead-in tolerance keeps the highlight from lagging the
// reciter on the very first word.
export function activeWordIndex(segments: WordSegment[], ms: number): number {
  for (const [startWord, , startMs, endMs] of segments) {
    if (ms >= startMs && ms < endMs) return startWord;
  }
  return -1;
}
