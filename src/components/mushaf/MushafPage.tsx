"use client";

import { Fragment, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useSettings } from "@/hooks/useSettings";
import { useMemorization } from "@/hooks/useMemorization";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic, cn } from "@/lib/utils";
import { TajweedText } from "@/components/ui/TajweedText";
import { MushafFrame } from "./MushafFrame";
import { SurahCartouche } from "./SurahCartouche";
import { BismillahLine } from "./BismillahLine";
import type { MushafPageData, SurahHeader } from "@/lib/types";

interface MushafPageProps {
  data: MushafPageData;
  // When true, verses the user has marked memorized are blurred so the user
  // can recall the text. Tap-to-reveal temporarily un-blurs a single verse.
  memorizationMode?: boolean;
}

export function MushafPage({ data, memorizationMode = false }: MushafPageProps) {
  const { settings } = useSettings();
  const { t, isAr } = useTranslation();
  const { isMemorized, toggle, mounted } = useMemorization();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  // Subscribe to the verse the global player is on so the page can mark it while
  // audio plays (continuous mode advances this as each ayah ends).
  const playingKey = usePlayer((s) => {
    if (s.status !== "playing" && s.status !== "loading") return null;
    const c = s.queue[s.index];
    return c ? `${c.surah}:${c.ayah}` : null;
  });

  // Playback runs through the global store. Memorize mode only controls text
  // visibility, so the two never contend for the shared audio element.
  const surahNameOf = (header: SurahHeader | undefined): string | null =>
    header ? (isAr ? header.nameArabic : header.nameSimple) : null;

  // A plain tap plays just this verse and stops (single mode).
  const handleVerseTap = (surah: number, ayah: number, header: SurahHeader | undefined) => {
    usePlayer.getState().playVerse(surah, ayah, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: surahNameOf(header),
    });
  };

  // "Play from here" plays the rest of the surah continuously from this verse.
  const handlePlayFromHere = (e: React.MouseEvent, surah: number, ayah: number, header: SurahHeader | undefined) => {
    e.stopPropagation();
    if (!header) return;
    usePlayer.getState().playSurah(surah, ayah, header.versesCount, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: surahNameOf(header),
    });
  };

  const handleToggleMemorized = (e: React.MouseEvent, verseKey: string) => {
    e.stopPropagation();
    toggle(verseKey);
  };

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
                <span className="inline-flex items-baseline relative">
                  <button
                    type="button"
                    onClick={() => handleVerseTap(v.surah, v.ayah, header)}
                    aria-label={`${t("mushaf.tapToHear")} (${v.surah}:${v.ayah})`}
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
                  {mounted && (
                    <button
                      type="button"
                      onClick={(e) => handlePlayFromHere(e, v.surah, v.ayah, header)}
                      aria-label={`${t("player.playFromHere")} (${v.surah}:${v.ayah})`}
                      title={t("player.playFromHere")}
                      className="ms-1 inline-flex items-center justify-center w-6 h-6 align-middle rounded-full text-text-muted/40 hover:text-primary opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M4 5v14l8-7zM13 5v14l8-7z" />
                      </svg>
                    </button>
                  )}
                  {mounted && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleMemorized(e, v.verseKey)}
                      aria-label={memorized ? t("mushaf.memorizeUnmark") : t("mushaf.memorizeMark")}
                      aria-pressed={memorized}
                      className={cn(
                        "ms-1 inline-flex items-center justify-center w-6 h-6 align-middle rounded-full transition-opacity",
                        memorized
                          ? "text-primary dark:text-primary-light opacity-90"
                          : "text-text-muted/40 hover:text-primary opacity-0 hover:opacity-100 focus:opacity-100",
                      )}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={memorized ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  )}
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
