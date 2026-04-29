import type {
  QuranApiResponse,
  QuranApiVerse,
  MushafPageData,
  SurahHeader,
  VerseTajweed,
  RevelationPlace,
} from "./types";
import surahIndex from "@/data/content/surah-index.json";

const BASE_URL = "https://api.quran.com/api/v4";
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
