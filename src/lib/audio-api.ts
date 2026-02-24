import type { ReciterId } from "./types";

const BASE_URL = "https://api.alquran.cloud/v1";

const RECITER_MAP: Record<ReciterId, string> = {
  husary: "ar.husary",
  alafasy: "ar.alafasy",
};

const audioCache = new Map<string, { url: string; timestamp: number }>();
const AUDIO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function getAudioUrl(surah: number, ayah: number, reciter: ReciterId = "husary"): string {
  const edition = RECITER_MAP[reciter];
  return `${BASE_URL}/ayah/${surah}:${ayah}/${edition}`;
}

export async function fetchAudioUrl(surah: number, ayah: number, reciter: ReciterId = "husary"): Promise<string> {
  const cacheKey = `${surah}:${ayah}:${reciter}`;
  const cached = audioCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AUDIO_CACHE_TTL) {
    return cached.url;
  }

  const url = getAudioUrl(surah, ayah, reciter);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Audio API error: ${response.status}`);
  }
  const data = await response.json();
  const audioUrl = data.data.audio;

  audioCache.set(cacheKey, { url: audioUrl, timestamp: Date.now() });
  return audioUrl;
}

export const RECITERS: { id: ReciterId; name: string; description: string }[] = [
  { id: "husary", name: "Mahmoud Khalil Al-Husary", description: "Teaching style - slow and clear" },
  { id: "alafasy", name: "Mishary Rashid Alafasy", description: "Beautiful melodic recitation" },
];
