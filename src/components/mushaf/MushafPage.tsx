"use client";

import { Fragment } from "react";
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
        <div className="leading-[2.6]">
          {data.verses.map((v, i) => {
            const prev = i > 0 ? data.verses[i - 1] : null;
            // A surah begins on this page when ayah 1 appears as the first
            // verse rendered or directly after a verse from a different surah.
            // Render the cartouche and Bismillah at this exact boundary so the
            // layout matches a physical Mushaf, where surah headings interleave
            // with verses instead of all stacking at the top of the page.
            const beginsNewSurah = v.ayah === 1 && (!prev || prev.surah !== v.surah);
            const surahMeta = beginsNewSurah
              ? data.surahsOnPage.find((s) => s.number === v.surah)
              : null;

            if (beginsNewSurah && !surahMeta && process.env.NODE_ENV !== "production") {
              console.warn(
                `MushafPage: missing surah metadata for surah ${v.surah} on page ${data.pageNumber}`
              );
            }

            return (
              <Fragment key={v.verseKey}>
                {beginsNewSurah && surahMeta && (
                  <header>
                    <SurahCartouche surah={surahMeta} />
                    <BismillahLine surahNumber={v.surah} />
                  </header>
                )}
                <button
                  type="button"
                  onClick={() => handleVerseTap(v.surah, v.ayah)}
                  aria-label={`${t("mushaf.tapToHear")} (${v.surah}:${v.ayah})`}
                  className="mushaf-verse"
                >
                  <TajweedText tajweedHtml={v.tajweedHtml} className="!leading-[2.6]" />{" "}
                </button>
              </Fragment>
            );
          })}
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
