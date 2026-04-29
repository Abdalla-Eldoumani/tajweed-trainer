"use client";

import { useAudio } from "@/hooks/useAudio";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic } from "@/lib/utils";
import { TajweedText } from "@/components/ui/TajweedText";
import { MushafFrame } from "./MushafFrame";
import { SurahCartouche } from "./SurahCartouche";
import { BismillahLine } from "./BismillahLine";
import type { MushafPageData } from "@/lib/types";

interface MushafPageProps {
  data: MushafPageData;
}

export function MushafPage({ data }: MushafPageProps) {
  const { play } = useAudio();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const handleVerseTap = (surah: number, ayah: number) => {
    play(surah, ayah, settings.reciter, settings.playbackSpeed);
  };

  return (
    <MushafFrame>
      <article
        dir="rtl"
        lang="ar"
        className="font-quran leading-[2.4] text-arabic-xl text-justify"
        style={{ textAlignLast: "center" }}
      >
        {data.surahsOnPage.map((s) => (
          <header key={s.number}>
            <SurahCartouche surah={s} />
            <BismillahLine surahNumber={s.number} />
          </header>
        ))}

        <div className="leading-[2.6]">
          {data.verses.map((v) => (
            <button
              key={v.verseKey}
              type="button"
              onClick={() => handleVerseTap(v.surah, v.ayah)}
              aria-label={`${t("mushaf.tapToHear")} (${v.surah}:${v.ayah})`}
              className="mushaf-verse"
            >
              <TajweedText tajweedHtml={v.tajweedHtml} className="!leading-[2.6]" />{" "}
            </button>
          ))}
        </div>
      </article>

      <footer className="mt-6 pt-4 flex items-center justify-between text-xs text-text-muted font-arabic" dir="rtl">
        <span>
          {t("mushaf.juz")} {toArabicIndic(data.juzNumber)}
        </span>
        <span>
          {toArabicIndic(data.pageNumber)} / {toArabicIndic(604)}
        </span>
      </footer>
    </MushafFrame>
  );
}
