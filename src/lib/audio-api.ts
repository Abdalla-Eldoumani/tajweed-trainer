import type { ReciterId } from "./types";

const BASE_URL = "https://api.alquran.cloud/v1";

const RECITER_MAP: Record<ReciterId, string> = {
  husary: "ar.husary",
  alafasy: "ar.alafasy",
};

export function getAudioUrl(surah: number, ayah: number, reciter: ReciterId = "husary"): string {
  const edition = RECITER_MAP[reciter];
  return `${BASE_URL}/ayah/${surah}:${ayah}/${edition}`;
}

export async function fetchAudioUrl(surah: number, ayah: number, reciter: ReciterId = "husary"): Promise<string> {
  const url = getAudioUrl(surah, ayah, reciter);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Audio API error: ${response.status}`);
  }
  const data = await response.json();
  return data.data.audio;
}

export const RECITERS: { id: ReciterId; name: string; description: string }[] = [
  { id: "husary", name: "Mahmoud Khalil Al-Husary", description: "Teaching style - slow and clear" },
  { id: "alafasy", name: "Mishary Rashid Alafasy", description: "Beautiful melodic recitation" },
];
