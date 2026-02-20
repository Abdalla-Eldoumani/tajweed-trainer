export interface TajweedColor {
  cssClass: string;
  hex: string;
  hexDark: string;
  nameEn: string;
  nameAr: string;
}

export const TAJWEED_COLORS: TajweedColor[] = [
  { cssClass: "ghunnah", hex: "#169200", hexDark: "#1DBF00", nameEn: "Ghunnah", nameAr: "غنّة" },
  { cssClass: "ikhfaa", hex: "#D98000", hexDark: "#F0A030", nameEn: "Ikhfaa", nameAr: "إخفاء" },
  { cssClass: "ikhfaa_shafawi", hex: "#D98000", hexDark: "#F0A030", nameEn: "Ikhfaa Shafawi", nameAr: "إخفاء شفوي" },
  { cssClass: "idgham_ghunnah", hex: "#9400A8", hexDark: "#C040D8", nameEn: "Idgham with Ghunnah", nameAr: "إدغام بغنة" },
  { cssClass: "idgham_no_ghunnah", hex: "#0057D9", hexDark: "#4090FF", nameEn: "Idgham without Ghunnah", nameAr: "إدغام بلا غنة" },
  { cssClass: "idgham_shafawi", hex: "#9400A8", hexDark: "#C040D8", nameEn: "Idgham Shafawi", nameAr: "إدغام شفوي" },
  { cssClass: "idgham_mutajanisayn", hex: "#0057D9", hexDark: "#4090FF", nameEn: "Idgham Mutajanisayn", nameAr: "إدغام متجانسين" },
  { cssClass: "idgham_mutaqaribayn", hex: "#0057D9", hexDark: "#4090FF", nameEn: "Idgham Mutaqaribayn", nameAr: "إدغام متقاربين" },
  { cssClass: "iqlab", hex: "#26A69A", hexDark: "#40C4B8", nameEn: "Iqlab", nameAr: "إقلاب" },
  { cssClass: "qalqalah", hex: "#A30000", hexDark: "#E03030", nameEn: "Qalqalah", nameAr: "قلقلة" },
  { cssClass: "madda_normal", hex: "#E06050", hexDark: "#F08070", nameEn: "Madd (Normal)", nameAr: "مدّ طبيعي" },
  { cssClass: "madda_obligatory", hex: "#D50000", hexDark: "#FF3030", nameEn: "Madd (Obligatory)", nameAr: "مدّ لازم" },
  { cssClass: "madda_permissible", hex: "#E8567F", hexDark: "#F07090", nameEn: "Madd (Permissible)", nameAr: "مدّ جائز" },
  { cssClass: "laam_shamsiyah", hex: "#707070", hexDark: "#909090", nameEn: "Laam Shamsiyyah", nameAr: "لام شمسية" },
  { cssClass: "silent", hex: "#AAAAAA", hexDark: "#CCCCCC", nameEn: "Silent", nameAr: "حرف ساكن" },
  { cssClass: "ham_wasl", hex: "#AAAAAA", hexDark: "#CCCCCC", nameEn: "Hamzat Al-Wasl", nameAr: "همزة الوصل" },
];

export function getColorForClass(cssClass: string): TajweedColor | undefined {
  return TAJWEED_COLORS.find((c) => c.cssClass === cssClass);
}

export function getUniqueColors(): TajweedColor[] {
  const seen = new Set<string>();
  return TAJWEED_COLORS.filter((c) => {
    if (seen.has(c.hex)) return false;
    seen.add(c.hex);
    return true;
  });
}
