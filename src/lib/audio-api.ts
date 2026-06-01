import type { ReciterId } from "./types";
import { DEFAULT_RECITER_ID, normalizeReciterId } from "./reciters";

// Quran.com per-ayah audio. The by_ayah endpoint returns a path relative to the
// audio CDN; prefix it with AUDIO_CDN to get the playable file URL.
const QURAN_API = "https://api.quran.com/api/v4";
const AUDIO_CDN = "https://verses.quran.com/";

const audioCache = new Map<string, { url: string; timestamp: number }>();
const AUDIO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// The by_ayah `url` may be relative ("Alafasy/mp3/001001.mp3"), protocol-
// relative ("//mirrors.quranicaudio.com/..."), or absolute. Normalize to https.
function toAudioFileUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("//")) return `https:${path}`;
  return AUDIO_CDN + path.replace(/^\/+/, "");
}

export function getAudioEndpoint(surah: number, ayah: number, reciter: ReciterId = DEFAULT_RECITER_ID): string {
  return `${QURAN_API}/recitations/${normalizeReciterId(reciter)}/by_ayah/${surah}:${ayah}`;
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

  const response = await fetch(getAudioEndpoint(surah, ayah, id));
  if (!response.ok) {
    throw new Error(`Audio API error: ${response.status}`);
  }
  const data = await response.json();
  const path = data?.audio_files?.[0]?.url;
  if (typeof path !== "string" || path.length === 0) {
    throw new Error("Audio API returned no file for this verse");
  }
  const audioUrl = toAudioFileUrl(path);

  audioCache.set(cacheKey, { url: audioUrl, timestamp: Date.now() });
  return audioUrl;
}
