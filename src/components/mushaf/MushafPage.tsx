"use client";

import { Fragment, useEffect, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useMemorization } from "@/hooks/useMemorization";
import { useVerseNotes } from "@/hooks/useVerseNotes";
import { useVerseSelection } from "./useVerseSelection";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic, cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { TajweedText } from "@/components/ui/TajweedText";
import { MushafFrame } from "./MushafFrame";
import { SurahCartouche } from "./SurahCartouche";
import { BismillahLine } from "./BismillahLine";
import type { MushafPageData } from "@/lib/types";

// A plus glyph for "add to selection" and a check for "added"; the add control
// is a third, distinct per-verse affordance (after the play tap and the details
// control) so building a revision set is deliberate and never the plain tap.
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface MushafPageProps {
  data: MushafPageData;
  // When true, verses the user has marked memorized are blurred so the user
  // can recall the text. Tap-to-reveal temporarily un-blurs a single verse.
  memorizationMode?: boolean;
  // "surah:ayah" to scroll into view on mount (a lesson "open in reader" link).
  targetVerseKey?: string | null;
  // A plain tap on a verse plays it (single mode) and surfaces the playback
  // surface. This is the primary verse action now; the old tap-opens-panel
  // behavior moved to the dedicated details control below.
  onPlayVerse?: (verseKey: string) => void;
  // Opens the reading-depth panel (translation, tafsir, word-by-word) for a
  // verse. Reached from a distinct, touch-discoverable per-verse details
  // control, never the plain tap, so a tap is never ambiguous.
  onSelectVerse?: (verseKey: string) => void;
}

export function MushafPage({ data, memorizationMode = false, targetVerseKey = null, onPlayVerse, onSelectVerse }: MushafPageProps) {
  const { t } = useTranslation();
  const { isMemorized, mounted } = useMemorization();
  const { hasNote, mounted: notesMounted } = useVerseNotes();
  const { isSelected, toggle: toggleSelected } = useVerseSelection();
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
    if (el) el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [targetVerseKey, data.pageNumber]);

  // The recall Reveal pill temporarily un-blurs one memorized verse; it stops
  // propagation so it never also fires the verse's play tap.
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
            const selected = isSelected(v.verseKey);
            // Gated on notesMounted so the dot never flashes during hydration
            // (the server snapshot has no notes).
            const noted = notesMounted && hasNote(v.verseKey);

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
                    onClick={() => onPlayVerse?.(v.verseKey)}
                    aria-label={`${t("mushaf.tapToHear")} (${v.surah}:${v.ayah})`}
                    aria-current={isPlaying ? "true" : undefined}
                    className={cn(
                      "mushaf-verse",
                      hideText && "select-none",
                      isPlaying && "mushaf-verse-playing",
                      selected && "mushaf-verse-selected",
                    )}
                  >
                    <TajweedText
                      tajweedHtml={v.tajweedHtml}
                      explainRules
                      className={cn(
                        "!leading-[2.6] transition-[filter,opacity] duration-300",
                        hideText && "blur-md opacity-60",
                      )}
                    />{" "}
                  </button>
                  {/* A distinct, always-present details control opens the
                      reading-depth panel (translation, tafsir, verse actions).
                      It is the touch-discoverable replacement for the old
                      tap-opens-panel behavior; stopPropagation keeps it from
                      also firing the verse's play tap. Quiet glyph inline with
                      the ayah marker, padded to a 32px+ hit area. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVerse?.(v.verseKey);
                    }}
                    aria-label={`${noted ? `${t("mushaf.verseActions")} — ${t("notes.hasNote")}` : t("mushaf.verseActions")} (${v.surah}:${v.ayah})`}
                    title={noted ? `${t("mushaf.verseActions")} — ${t("notes.hasNote")}` : t("mushaf.verseActions")}
                    className="mushaf-verse-details relative ms-0.5 inline-flex items-center justify-center align-middle p-1.5 rounded-full text-text-muted hover:text-primary dark:hover:text-primary-light hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="5" cy="12" r="1.8" />
                      <circle cx="12" cy="12" r="1.8" />
                      <circle cx="19" cy="12" r="1.8" />
                    </svg>
                    {/* A quiet gold dot marks a verse that carries a private
                        note; purely decorative (the accessible name above
                        already says so). */}
                    {noted && (
                      <span
                        className="absolute top-0.5 end-0.5 w-1.5 h-1.5 rounded-full bg-gold"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  {/* Add-to-selection: a distinct, always-present control that
                      toggles the verse in the multi-verse set. Separate from the
                      plain play tap and the details control, so building a
                      revision queue is deliberate and a tap is never ambiguous.
                      stopPropagation keeps it from also firing the verse's play
                      tap; the aria-label flips with state. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelected(v.verseKey);
                    }}
                    aria-label={`${selected ? t("player.removeFromSelection") : t("player.addToSelection")} (${v.surah}:${v.ayah})`}
                    aria-pressed={selected}
                    title={selected ? t("player.removeFromSelection") : t("player.addToSelection")}
                    className={cn(
                      "mushaf-verse-add ms-0.5 inline-flex items-center justify-center align-middle p-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1",
                      selected
                        ? "text-primary dark:text-primary-light bg-primary/10"
                        : "text-text-muted hover:text-primary dark:hover:text-primary-light hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
                    )}
                  >
                    {selected ? <CheckIcon /> : <PlusIcon />}
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
