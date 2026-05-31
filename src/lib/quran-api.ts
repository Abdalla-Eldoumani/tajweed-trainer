import type {
  QuranApiResponse,
  QuranApiVerse,
  MushafPageData,
  SurahHeader,
  VerseTajweed,
  RevelationPlace,
  VerseWord,
  TranslationResource,
  TafsirResource,
} from "./types";
import surahIndex from "@/data/content/surah-index.json";
import { sanitizeTafsirHtml } from "./sanitize";
import { clampSurah, isValidResourceId, isValidVerseKey } from "./validate";

const BASE_URL = "https://api.quran.com/api/v4";
// Word-by-word audio clips are served from the Quran.com audio CDN as relative
// paths; absolute and protocol-relative forms are passed through unchanged.
const WORD_AUDIO_CDN = "https://audio.qurancdn.com/";
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const LONG_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for chapter metadata

async function fetchWithRetry(url: string, retries = 2, delay = 1000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Quran API error: ${response.status} ${response.statusText}`);
      }

      // Server error, retry with backoff
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }
      throw new Error(`Quran API error: ${response.status} ${response.statusText}`);
    } catch (err) {
      if (attempt < retries && err instanceof TypeError) {
        // Network error, retry with backoff
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Quran API: max retries exceeded");
}

async function fetchWithCache<T>(url: string, ttl = CACHE_TTL): Promise<T> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }

  const response = await fetchWithRetry(url);
  const data = await response.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data as T;
}

export async function getTajweedSurah(surah: number): Promise<{ verseKey: string; tajweedHtml: string }[]> {
  const url = `${BASE_URL}/verses/by_chapter/${surah}?words=false&fields=text_uthmani_tajweed&per_page=286`;
  const data = await fetchWithCache<QuranApiResponse>(url);
  return data.verses.map((v) => ({
    verseKey: v.verse_key,
    tajweedHtml: v.text_uthmani_tajweed,
  }));
}

const BUNDLED_SURAH_INDEX = surahIndex as SurahHeader[];

export function getBundledChaptersIndex(): SurahHeader[] {
  return BUNDLED_SURAH_INDEX;
}

interface ChaptersApiResponse {
  chapters: Array<{
    id: number;
    name_simple: string;
    name_arabic: string;
    verses_count: number;
    pages: [number, number];
    bismillah_pre: boolean;
    revelation_place: string;
  }>;
}

export async function getChaptersIndex(): Promise<SurahHeader[]> {
  try {
    const data = await fetchWithCache<ChaptersApiResponse>(
      `${BASE_URL}/chapters`,
      LONG_CACHE_TTL,
    );
    if (!data.chapters || data.chapters.length !== 114) {
      return BUNDLED_SURAH_INDEX;
    }
    return data.chapters.map((c) => ({
      number: c.id,
      nameSimple: c.name_simple,
      nameArabic: c.name_arabic,
      versesCount: c.verses_count,
      pages: c.pages,
      bismillahPre: c.bismillah_pre,
      revelationPlace: (c.revelation_place === "madinah" ? "madinah" : "makkah") as RevelationPlace,
    }));
  } catch {
    return BUNDLED_SURAH_INDEX;
  }
}

function parseVerseKey(verseKey: string): { surah: number; ayah: number } {
  const [s, a] = verseKey.split(":").map(Number);
  return { surah: s, ayah: a };
}

export async function getTajweedPage(pageNumber: number): Promise<MushafPageData> {
  if (pageNumber < 1 || pageNumber > 604) {
    throw new Error(`Invalid Mushaf page number: ${pageNumber}`);
  }
  const url = `${BASE_URL}/verses/by_page/${pageNumber}?words=false&fields=text_uthmani_tajweed,page_number,juz_number&per_page=50`;
  const data = await fetchWithCache<QuranApiResponse>(url);

  const verses: VerseTajweed[] = data.verses.map((v: QuranApiVerse) => {
    const { surah, ayah } = parseVerseKey(v.verse_key);
    return {
      verseKey: v.verse_key,
      surah,
      ayah,
      tajweedHtml: v.text_uthmani_tajweed,
      juzNumber: v.juz_number ?? 0,
    };
  });

  // A surah "starts on this page" when its first ayah appears here.
  const surahsOnPage: SurahHeader[] = [];
  const seen = new Set<number>();
  for (const v of verses) {
    if (v.ayah === 1 && !seen.has(v.surah)) {
      seen.add(v.surah);
      const meta = BUNDLED_SURAH_INDEX.find((s) => s.number === v.surah);
      if (meta) surahsOnPage.push(meta);
    }
  }

  const juzNumber = verses[0]?.juzNumber ?? 0;

  return {
    pageNumber,
    juzNumber,
    verses,
    surahsOnPage,
  };
}

export function getStartPageForSurah(surahNumber: number): number {
  const meta = BUNDLED_SURAH_INDEX.find((s) => s.number === surahNumber);
  return meta?.pages[0] ?? 1;
}

// --- Reading depth: translations, tafsir, word-by-word -----------------------
// Every field is fetched from the authenticated Quran.com API and never
// generated. Requests are made per chapter (not per ayah) and cached, per the
// rate-limit edge case. Tafsir and translation HTML pass through the shared
// sanitizer before they can reach a renderer.

interface TranslationsApiResponse {
  verses: Array<{ verse_key: string; translations?: Array<{ text?: string }> }>;
}

// verse_key ("s:a") -> sanitized translation text, for a whole chapter in one call.
export async function getTranslationsForChapter(
  surah: number,
  translationId: number,
): Promise<Record<string, string>> {
  if (!isValidResourceId(translationId)) return {};
  const url = `${BASE_URL}/verses/by_chapter/${clampSurah(surah)}?translations=${translationId}&fields=text_uthmani&per_page=286`;
  const data = await fetchWithCache<TranslationsApiResponse>(url);
  const out: Record<string, string> = {};
  for (const v of data.verses ?? []) {
    const text = v.translations?.[0]?.text;
    if (typeof text === "string") out[v.verse_key] = sanitizeTafsirHtml(text);
  }
  return out;
}

interface TafsirApiResponse {
  tafsir?: { text?: string };
  tafsirs?: Array<{ text?: string }>;
}

// Sanitized tafsir HTML for one verse; empty string when none is available.
export async function getTafsirForVerse(verseKey: string, tafsirId: number): Promise<string> {
  if (!isValidVerseKey(verseKey) || !isValidResourceId(tafsirId)) return "";
  const url = `${BASE_URL}/quran/tafsirs/${tafsirId}?verse_key=${encodeURIComponent(verseKey)}`;
  const data = await fetchWithCache<TafsirApiResponse>(url);
  const text = data.tafsir?.text ?? data.tafsirs?.[0]?.text ?? "";
  return typeof text === "string" ? sanitizeTafsirHtml(text) : "";
}

interface WordsApiResponse {
  verses: Array<{
    verse_key: string;
    words?: Array<{
      position?: number;
      text_uthmani?: string;
      transliteration?: { text?: string | null } | null;
      translation?: { text?: string | null } | null;
      audio_url?: string | null;
    }>;
  }>;
}

function toWordAudioUrl(path: string | null | undefined): string | null {
  if (typeof path !== "string" || path.length === 0) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("//")) return `https:${path}`;
  return WORD_AUDIO_CDN + path.replace(/^\/+/, "");
}

// verse_key -> ordered words with per-word transliteration, gloss and audio URL.
export async function getWordsForChapter(surah: number): Promise<Record<string, VerseWord[]>> {
  const url = `${BASE_URL}/verses/by_chapter/${clampSurah(surah)}?words=true&word_fields=text_uthmani,transliteration&per_page=286`;
  const data = await fetchWithCache<WordsApiResponse>(url);
  const out: Record<string, VerseWord[]> = {};
  for (const v of data.verses ?? []) {
    out[v.verse_key] = (v.words ?? []).map((w, i) => ({
      position: typeof w.position === "number" ? w.position : i + 1,
      textUthmani: typeof w.text_uthmani === "string" ? w.text_uthmani : "",
      transliteration: w.transliteration?.text ?? null,
      translation: w.translation?.text ?? null,
      audioUrl: toWordAudioUrl(w.audio_url),
    }));
  }
  return out;
}

interface ResourceApiResponse {
  translations?: Array<{ id: number; name: string; author_name?: string; language_name?: string }>;
  tafsirs?: Array<{ id: number; name: string; author_name?: string; language_name?: string }>;
}

function mapResource(t: { id: number; name: string; author_name?: string; language_name?: string }): TranslationResource {
  return { id: t.id, name: t.name, authorName: t.author_name ?? "", languageName: t.language_name ?? "" };
}

export async function getResourceTranslations(): Promise<TranslationResource[]> {
  const data = await fetchWithCache<ResourceApiResponse>(`${BASE_URL}/resources/translations`, LONG_CACHE_TTL);
  return (data.translations ?? []).map(mapResource);
}

export async function getResourceTafsirs(): Promise<TafsirResource[]> {
  const data = await fetchWithCache<ResourceApiResponse>(`${BASE_URL}/resources/tafsirs`, LONG_CACHE_TTL);
  return (data.tafsirs ?? []).map(mapResource);
}
