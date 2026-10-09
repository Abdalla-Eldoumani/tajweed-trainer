"use client";

import { cn, toArabicIndic } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// The verse-end marker from the reader, reused for numbering: the numeral
// sits in a gold-ruled ring, Arabic-Indic in Arabic, Western in English.
export function Medallion({ n, className }: { n: number; className?: string }) {
  const { isAr } = useTranslation();
  return (
    <span className={cn("medallion", isAr ? "font-quran" : "font-heading font-semibold", className)} aria-hidden="true">
      {isAr ? toArabicIndic(n) : n}
    </span>
  );
}
