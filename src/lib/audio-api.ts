import { RECITER_IDENTIFIER_PATTERN, type ReciterId, type ReciterEdition } from "./types";

const BASE_URL = "https://api.alquran.cloud/v1";

// Aliases for the two defaults so persisted settings written before this
// expansion still resolve to a real alquran.cloud edition. New reciter ids
// added via the editions API are passed through as-is.
const DEFAULT_ALIASES: Record<string, string> = {
  husary: "ar.husary",
  alafasy: "ar.alafasy",
};

const audioCache = new Map<string, { url: string; timestamp: number }>();
const AUDIO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function validateReciterIdentifier(value: unknown): value is string {
  return typeof value === "string" && RECITER_IDENTIFIER_PATTERN.test(value);
}

export function resolveReciterIdentifier(reciter: ReciterId): string {
  if (DEFAULT_ALIASES[reciter]) return DEFAULT_ALIASES[reciter];
  return reciter;
}

export function getAudioUrl(surah: number, ayah: number, reciter: ReciterId = "husary"): string {
  const edition = resolveReciterIdentifier(reciter);
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

// Built-in reciters surfaced when the editions API hasn't loaded yet (or has
// failed). Husary and Alafasy are the two we ship and validate against.
export const DEFAULT_RECITER_EDITIONS: ReciterEdition[] = [
  {
    identifier: "ar.husary",
    language: "ar",
    name: "محمود خليل الحصري",
    englishName: "Mahmoud Khalil Al-Husary (Mu'allim)",
    format: "audio",
    type: "versebyverse",
  },
  {
    identifier: "ar.alafasy",
    language: "ar",
    name: "مشاري راشد العفاسي",
    englishName: "Mishary Rashid Alafasy",
    format: "audio",
    type: "versebyverse",
  },
];

interface EditionsApiResponse {
  code: number;
  status: string;
  data: Array<{
    identifier?: unknown;
    language?: unknown;
    name?: unknown;
    englishName?: unknown;
    format?: unknown;
    type?: unknown;
  }>;
}

function isAudioVerseEdition(raw: unknown): raw is ReciterEdition {
  if (typeof raw !== "object" || raw === null) return false;
  const e = raw as Record<string, unknown>;
  if (!validateReciterIdentifier(e.identifier)) return false;
  if (typeof e.language !== "string" || e.language.length === 0 || e.language.length > 16) return false;
  if (typeof e.name !== "string" || e.name.length === 0 || e.name.length > 200) return false;
  if (typeof e.englishName !== "string" || e.englishName.length === 0 || e.englishName.length > 200) return false;
  if (e.format !== "audio") return false;
  if (e.type !== "versebyverse") return false;
  return true;
}

// Fetches the verse-by-verse audio editions and returns a deduped list with
// the two defaults pinned at the front. On any failure, returns just the
// defaults — the UI must always render those two.
export async function fetchReciterEditions(signal?: AbortSignal): Promise<ReciterEdition[]> {
  try {
    const response = await fetch(`${BASE_URL}/edition?format=audio&type=versebyverse`, { signal });
    if (!response.ok) return DEFAULT_RECITER_EDITIONS;
    const json = (await response.json()) as EditionsApiResponse;
    if (!Array.isArray(json.data)) return DEFAULT_RECITER_EDITIONS;
    const valid = json.data.filter(isAudioVerseEdition) as ReciterEdition[];
    return mergeWithDefaults(valid);
  } catch {
    return DEFAULT_RECITER_EDITIONS;
  }
}

// Pin the two defaults at the front, then append any additional editions the
// API returned (deduped by identifier). The two defaults always come from
// DEFAULT_RECITER_EDITIONS — we never trust the API's name fields for them.
export function mergeWithDefaults(editions: ReciterEdition[]): ReciterEdition[] {
  const out: ReciterEdition[] = [...DEFAULT_RECITER_EDITIONS];
  const seen = new Set(out.map((e) => e.identifier));
  for (const e of editions) {
    if (!seen.has(e.identifier)) {
      out.push(e);
      seen.add(e.identifier);
    }
  }
  return out;
}

// Keep the legacy export shape for any code still importing `RECITERS`.
// Each entry exposes its identifier as the id (so `husary` settings still
// resolve via the alias), the English name, and a one-line description.
export const RECITERS: { id: ReciterId; name: string; description: string }[] = [
  { id: "husary", name: "Mahmoud Khalil Al-Husary", description: "Teaching style - slow and clear" },
  { id: "alafasy", name: "Mishary Rashid Alafasy", description: "Beautiful melodic recitation" },
];
