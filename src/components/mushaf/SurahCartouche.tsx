"use client";

import { ArabicText } from "@/components/ui/ArabicText";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic } from "@/lib/utils";
import type { SurahHeader } from "@/lib/types";

interface SurahCartoucheProps {
  surah: SurahHeader;
}

// Ornamental banner shown when a surah starts on the current page.
// Uses the surah-cartouche CSS class defined in globals.css for the framing.
export function SurahCartouche({ surah }: SurahCartoucheProps) {
  const { t, isAr } = useTranslation();
  const placeKey = surah.revelationPlace === "madinah" ? "mushaf.revealedIn.madinah" : "mushaf.revealedIn.makkah";
  const versesText = isAr
    ? t("mushaf.versesCount").replace("{count}", toArabicIndic(surah.versesCount))
    : t("mushaf.versesCount").replace("{count}", String(surah.versesCount));

  return (
    <div className="surah-cartouche">
      <ArabicText
        text={`سورة ${surah.nameArabic}`}
        quran
        size="lg"
        className="text-primary dark:text-primary-light block"
      />
      <p className="text-xs text-text-muted mt-1">
        <span className="font-heading font-medium">{surah.nameSimple}</span>
        <span className="mx-2 opacity-60">·</span>
        <span>{versesText}</span>
        <span className="mx-2 opacity-60">·</span>
        <span>{t(placeKey)}</span>
      </p>
    </div>
  );
}
