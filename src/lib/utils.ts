import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSurahAyah(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export function formatSurahReference(surahName: string, surah: number, ayah: number): string {
  return `${surahName} (${surah}:${ayah})`;
}
