import type { Recitation } from "./types";

// Verified recitations from the Quran.com Foundation API v4
// (GET /resources/recitations, Arabic names cross-checked via ?language=ar),
// captured 2026-05-30. The ids and styles are the API's own; none are invented.
// Per-verse audio is fetched at runtime in audio-api.ts.
export const RECITATIONS: Recitation[] = [
  { id: "1", nameEn: "AbdulBaset AbdulSamad", nameAr: "عبد الباسط عبد الصمد", style: "Mujawwad" },
  { id: "2", nameEn: "AbdulBaset AbdulSamad", nameAr: "عبد الباسط عبد الصمد", style: "Murattal" },
  { id: "3", nameEn: "Abdur-Rahman as-Sudais", nameAr: "عبدالرحمن السديس", style: null },
  { id: "4", nameEn: "Abu Bakr al-Shatri", nameAr: "أبو بكر الشاطرى", style: null },
  { id: "5", nameEn: "Hani ar-Rifai", nameAr: "هاني الرفاعي", style: null },
  { id: "6", nameEn: "Mahmoud Khalil Al-Husary", nameAr: "محمود خليل الحصري", style: null },
  { id: "7", nameEn: "Mishari Rashid al-`Afasy", nameAr: "مشاري راشد العفاسي", style: null },
  { id: "8", nameEn: "Mohamed Siddiq al-Minshawi", nameAr: "محمد صديق المنشاوي", style: "Mujawwad" },
  { id: "9", nameEn: "Mohamed Siddiq al-Minshawi", nameAr: "محمد صديق المنشاوي", style: "Murattal" },
  { id: "10", nameEn: "Sa`ud ash-Shuraym", nameAr: "سعود الشريم", style: null },
  { id: "11", nameEn: "Mohamed al-Tablawi", nameAr: "محمد الطبلاوي", style: null },
  { id: "12", nameEn: "Mahmoud Khalil Al-Husary", nameAr: "محمود خليل الحصري", style: "Muallim" },
  // EveryAyah reciters (ea-* ids). Names are id-joined from mp3quran.net and the
  // English name confirms identity; styles are unlabelled at the source (null),
  // so they group as murattal. Each per-ayah file was confirmed to resolve.
  // These have no Quran.com endpoint; audio-api.ts builds the URL from
  // EVERYAYAH_FOLDER below. The origin is allowlisted in media-url.ts + the CSP.
  { id: "ea-ghamdi", nameEn: "Saad al-Ghamdi", nameAr: "سعد الغامدي", style: null },
  { id: "ea-muaiqly", nameEn: "Maher al-Muaiqly", nameAr: "ماهر المعيقلي", style: null },
  { id: "ea-ayyoub", nameEn: "Muhammad Ayyoub", nameAr: "محمد أيوب", style: null },
  { id: "ea-hudhaifi", nameEn: "Ali al-Hudhaifi", nameAr: "علي بن عبدالرحمن الحذيفي", style: null },
  { id: "ea-basfar", nameEn: "Abdullah Basfar", nameAr: "عبدالله بصفر", style: null },
  { id: "ea-dossari", nameEn: "Yasser al-Dossari", nameAr: "ياسر الدوسري", style: null },
  { id: "ea-juhani", nameEn: "Abdullah Awad al-Juhani", nameAr: "عبدالله عواد الجهني", style: null },
];

// EveryAyah folder per ea-* reciter id. The per-ayah file path is
// data/{folder}/{SSS}{AAA}.mp3 (surah/ayah zero-padded to 3); audio-api.ts
// assembles it. Keep this in lockstep with the ea-* entries in RECITATIONS.
export const EVERYAYAH_FOLDER: Record<string, string> = {
  "ea-ghamdi": "Ghamadi_40kbps",
  "ea-muaiqly": "MaherAlMuaiqly128kbps",
  "ea-ayyoub": "Muhammad_Ayyoub_128kbps",
  "ea-hudhaifi": "Hudhaify_128kbps",
  "ea-basfar": "Abdullah_Basfar_192kbps",
  "ea-dossari": "Yasser_Ad-Dussary_128kbps",
  "ea-juhani": "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
};

// True for EveryAyah-sourced reciters, which build a direct URL instead of
// hitting the Quran.com by_ayah API.
export function isEveryAyahReciter(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(EVERYAYAH_FOLDER, id);
}

// Default: Al-Husary in the muallim (teaching) style, slow and clear.
export const DEFAULT_RECITER_ID = "12";

const BY_ID = new Map(RECITATIONS.map((r) => [r.id, r]));

// Legacy alquran.cloud identifiers, migrated to Quran.com recitation ids so
// settings persisted before the provider switch still resolve.
const LEGACY_ALIASES: Record<string, string> = {
  husary: "12",
  "ar.husary": "12",
  alafasy: "7",
  "ar.alafasy": "7",
};

export function getRecitation(id: string): Recitation | undefined {
  return BY_ID.get(id);
}

// Resolve any stored or supplied value to a known recitation id, migrating
// legacy identifiers and falling back to the default when unknown or malformed.
export function normalizeReciterId(value: unknown): string {
  if (typeof value === "string") {
    if (BY_ID.has(value)) return value;
    const legacy = LEGACY_ALIASES[value];
    if (legacy && BY_ID.has(legacy)) return legacy;
  }
  return DEFAULT_RECITER_ID;
}

// Two display groups per the PRD: Mujawwad, and Murattal (which gathers
// Murattal, Muallim, and the API's unspecified/null style — all measured
// recitations). Each reciter still carries its exact style for display.
export type ReciterStyleGroup = "mujawwad" | "murattal";

export function styleGroup(r: Recitation): ReciterStyleGroup {
  return r.style === "Mujawwad" ? "mujawwad" : "murattal";
}
