import type { QuranApiResponse } from "./types";

const BASE_URL = "https://api.quran.com/api/v4";
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchWithRetry(url: string, retries = 2, delay = 1000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Quran API error: ${response.status} ${response.statusText}`);
      }

      // Server error — retry with backoff
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }
      throw new Error(`Quran API error: ${response.status} ${response.statusText}`);
    } catch (err) {
      if (attempt < retries && err instanceof TypeError) {
        // Network error — retry with backoff
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Quran API: max retries exceeded");
}

async function fetchWithCache<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
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
