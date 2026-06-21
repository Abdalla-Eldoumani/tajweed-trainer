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
  // The verified EveryAyah Hafs reciters (each folder resolved a real ayah).
  // Arabic names sourced verbatim from the mp3quran.net ?language=ar listing,
  // except Husary Mujawwad (reuses the Al-Husary name already in the file) and
  // three reciters absent from that listing (Ayman Suwaid, Aziz Alili, Muhsin
  // al-Qasim), whose nameAr falls back to nameEn rather than guess a spelling.
  { id: "ea-abdullah-matroud", nameEn: "Abdullah Matroud", nameAr: "عبدالله المطرود", style: null },
  { id: "ea-ahmed-al-ajmi", nameEn: "Ahmed al-Ajmi", nameAr: "أحمد بن علي العجمي", style: null },
  { id: "ea-ahmed-nuaina", nameEn: "Ahmed Nuaina", nameAr: "أحمد نعينع", style: null },
  { id: "ea-akram-al-alaqimy", nameEn: "Akram al-Alaqimy", nameAr: "أكرم العلاقمي", style: null },
  { id: "ea-ali-hajjaj-al-suesy", nameEn: "Ali Hajjaj al-Suesy", nameAr: "علي حجاج السويسي", style: null },
  { id: "ea-ali-jaber", nameEn: "Ali Jaber", nameAr: "علي جابر", style: null },
  { id: "ea-ayman-suwaid", nameEn: "Ayman Suwaid", nameAr: "Ayman Suwaid", style: null },
  { id: "ea-aziz-alili", nameEn: "Aziz Alili", nameAr: "Aziz Alili", style: null },
  { id: "ea-fares-abbad", nameEn: "Fares Abbad", nameAr: "فارس عباد", style: null },
  { id: "ea-husary-mujawwad", nameEn: "Mahmoud Khalil Al-Husary", nameAr: "محمود خليل الحصري", style: "Mujawwad" },
  { id: "ea-ibrahim-al-akhdar", nameEn: "Ibrahim al-Akhdar", nameAr: "إبراهيم الأخضر", style: null },
  { id: "ea-khalid-al-qahtani", nameEn: "Khalid al-Qahtani", nameAr: "خالد القحطاني", style: null },
  { id: "ea-khalifa-al-tunaiji", nameEn: "Khalifa al-Tunaiji", nameAr: "خليفة الطنيجي", style: null },
  { id: "ea-mahmoud-ali-al-banna", nameEn: "Mahmoud Ali al-Banna", nameAr: "محمود علي البنا", style: null },
  { id: "ea-muhammad-abdul-kareem", nameEn: "Muhammad Abdul Kareem", nameAr: "محمد عبدالكريم", style: null },
  { id: "ea-muhammad-jibreel", nameEn: "Muhammad Jibreel", nameAr: "محمد جبريل", style: null },
  { id: "ea-muhsin-al-qasim", nameEn: "Muhsin al-Qasim", nameAr: "Muhsin al-Qasim", style: null },
  { id: "ea-nabil-ar-rifai", nameEn: "Nabil ar-Rifai", nameAr: "نبيل الرفاعي", style: null },
  { id: "ea-nasser-al-qatami", nameEn: "Nasser al-Qatami", nameAr: "ناصر القطامي", style: null },
  { id: "ea-sahl-yaseen", nameEn: "Sahl Yaseen", nameAr: "سهل ياسين", style: null },
  { id: "ea-salah-bukhatir", nameEn: "Salah Bukhatir", nameAr: "صلاح بو خاطر", style: null },
  { id: "ea-salah-al-budair", nameEn: "Salah al-Budair", nameAr: "صلاح البدير", style: null },
  { id: "ea-yaser-salamah", nameEn: "Yaser Salamah", nameAr: "ياسر سلامة", style: null },
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
  "ea-abdullah-matroud": "Abdullah_Matroud_128kbps",
  "ea-ahmed-al-ajmi": "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net",
  "ea-ahmed-nuaina": "Ahmed_Neana_128kbps",
  "ea-akram-al-alaqimy": "Akram_AlAlaqimy_128kbps",
  "ea-ali-hajjaj-al-suesy": "Ali_Hajjaj_AlSuesy_128kbps",
  "ea-ali-jaber": "Ali_Jaber_64kbps",
  "ea-ayman-suwaid": "Ayman_Sowaid_64kbps",
  "ea-aziz-alili": "aziz_alili_128kbps",
  "ea-fares-abbad": "Fares_Abbad_64kbps",
  "ea-husary-mujawwad": "Husary_128kbps_Mujawwad",
  "ea-ibrahim-al-akhdar": "Ibrahim_Akhdar_32kbps",
  "ea-khalid-al-qahtani": "Khaalid_Abdullaah_al-Qahtaanee_192kbps",
  "ea-khalifa-al-tunaiji": "Khalefa_Al_Tunaiji_64kbps",
  "ea-mahmoud-ali-al-banna": "mahmoud_ali_al_banna_32kbps",
  "ea-muhammad-abdul-kareem": "Muhammad_AbdulKareem_128kbps",
  "ea-muhammad-jibreel": "Muhammad_Jibreel_128kbps",
  "ea-muhsin-al-qasim": "Muhsin_Al_Qasim_192kbps",
  "ea-nabil-ar-rifai": "Nabil_Rifa3i_48kbps",
  "ea-nasser-al-qatami": "Nasser_Alqatami_128kbps",
  "ea-sahl-yaseen": "Sahl_Yassin_128kbps",
  "ea-salah-bukhatir": "Salaah_AbdulRahman_Bukhatir_128kbps",
  "ea-salah-al-budair": "Salah_Al_Budair_128kbps",
  "ea-yaser-salamah": "Yaser_Salamah_128kbps",
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
// Murattal, Muallim, and the API's unspecified/null style, all measured
// recitations). Each reciter still carries its exact style for display.
export type ReciterStyleGroup = "mujawwad" | "murattal";

export function styleGroup(r: Recitation): ReciterStyleGroup {
  return r.style === "Mujawwad" ? "mujawwad" : "murattal";
}
