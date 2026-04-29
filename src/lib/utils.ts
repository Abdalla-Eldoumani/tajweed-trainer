import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSurahAyah(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

type SurahNameInput = string | { en: string; ar?: string };

export function formatSurahReference(
  name: SurahNameInput,
  surah: number,
  ayah: number,
  locale: Language = "en",
): string {
  const surahName =
    typeof name === "string"
      ? name
      : locale === "ar" && name.ar
      ? name.ar
      : name.en;
  const ref = locale === "ar" ? `${toArabicIndic(surah)}:${toArabicIndic(ayah)}` : `${surah}:${ayah}`;
  return `${surahName} (${ref})`;
}

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toArabicIndic(value: number | string): string {
  return String(value).replace(/\d/g, (d) => ARABIC_INDIC_DIGITS[Number(d)] ?? d);
}
