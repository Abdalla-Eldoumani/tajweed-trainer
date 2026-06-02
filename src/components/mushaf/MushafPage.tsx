"use client";

import { Fragment, useEffect, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useMemorization } from "@/hooks/useMemorization";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic, cn } from "@/lib/utils";
import { TajweedText } from "@/components/ui/TajweedText";
import { MushafFrame } from "./MushafFrame";
import { SurahCartouche } from "./SurahCartouche";
import { BismillahLine } from "./BismillahLine";
import type { MushafPageData } from "@/lib/types";

interface MushafPageProps {
  data: MushafPageData;
  // When true, verses the user has marked memorized are blurred so the user
  // can recall the text. Tap-to-reveal temporarily un-blurs a single verse.
  memorizationMode?: boolean;
  // "surah:ayah" to scroll into view on mount (a lesson "open in reader" link).
  targetVerseKey?: string | null;
  // Opens the reading-depth panel (translation, tafsir, word-by-word) for a verse.
  onSelectVerse?: (verseKey: string) => void;
}

export function MushafPage({ data, memorizationMode = false, targetVerseKey = null, onSelectVerse }: MushafPageProps) {
  const { t } = useTranslation();
  const { isMemorized, mounted } = useMemorization();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  // Subscribe to the verse the global player is on so the page can mark it while
  // audio plays (continuous mode advances this as each ayah ends).
  const playingKey = usePlayer((s) => {
    if (s.status !== "playing" && s.status !== "loading") return null;
    const c = s.queue[s.index];
    return c ? `${c.surah}:${c.ayah}` : null;
  });

  // Scroll a lesson-targeted verse into view once the page renders.
  useEffect(() => {
    if (!targetVerseKey) return;
    const el = document.querySelector(`[data-verse-key="${CSS.escape(targetVerseKey)}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [targetVerseKey, data.pageNumber]);

  // Tapping a verse opens its reading-depth panel (translation, tafsir,
  // word-by-word); the play / bookmark / memorize actions live in that panel.
  const handleReveal = (e: React.MouseEvent, verseKey: string) => {
    e.stopPropagation();
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(verseKey)) next.delete(verseKey);
      else next.add(verseKey);
      return next;
    });
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
            const beginsNewSurah = v.ayah === 1 && (!prev || prev.surah !== v.surah);
            const header = data.surahsOnPage.find((s) => s.number === v.surah);
            const surahMeta = beginsNewSurah ? header : null;

            if (beginsNewSurah && !surahMeta && process.env.NODE_ENV !== "production") {
              console.warn(
                `MushafPage: missing surah metadata for surah ${v.surah} on page ${data.pageNumber}`
              );
            }

            const memorized = mounted && isMemorized(v.verseKey);
            const hideText = memorizationMode && memorized && !revealed.has(v.verseKey);
            const isPlaying = v.verseKey === playingKey;

            return (
              <Fragment key={v.verseKey}>
                {beginsNewSurah && surahMeta && (
                  <header>
                    <SurahCartouche surah={surahMeta} />
                    <BismillahLine surahNumber={v.surah} />
                  </header>
                )}
                <span data-verse-key={v.verseKey} className="inline-flex items-baseline relative">
                  <button
                    type="button"
                    onClick={() => onSelectVerse?.(v.verseKey)}
                    aria-label={`${t("mushaf.verseDetails")} (${v.surah}:${v.ayah})`}
                    aria-current={isPlaying ? "true" : undefined}
                    className={cn("mushaf-verse", hideText && "select-none", isPlaying && "mushaf-verse-playing")}
                  >
                    <TajweedText
                      tajweedHtml={v.tajweedHtml}
                      className={cn(
                        "!leading-[2.6] transition-[filter,opacity] duration-300",
                        hideText && "blur-md opacity-60",
                      )}
                    />{" "}
                  </button>
                  {hideText && (
                    <button
                      type="button"
                      onClick={(e) => handleReveal(e, v.verseKey)}
                      aria-label={t("mushaf.memorizeReveal")}
                      className="ms-1 inline-flex items-center justify-center text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:text-primary-light align-middle"
                    >
                      {t("mushaf.memorizeReveal")}
                    </button>
                  )}
                </span>
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
