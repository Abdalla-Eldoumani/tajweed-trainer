"use client";

import { Fragment, useEffect, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useFollowAlong } from "@/hooks/useFollowAlong";
import { useMemorization } from "@/hooks/useMemorization";
import { useVerseNotes } from "@/hooks/useVerseNotes";
import { useVerseSelection } from "./useVerseSelection";
import { useTranslation } from "@/lib/i18n";
import { wordCount } from "@/lib/follow-along";
import { toArabicIndic, cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { TajweedText } from "@/components/ui/TajweedText";
import { TajweedFollowText } from "@/components/ui/TajweedFollowText";
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
  // A plain tap on a verse opens the focused verse overlay for it; it does not
  // auto-play (the overlay's auto-focused "play this verse" does). A colored
  // tajweed letter is exempt: its tap opens the rule popover and stops there
  // (the explainRules stopPropagation seam), so it never reaches this button.
  onPlayVerse?: (verseKey: string) => void;
  // Opens the same verse overlay from a distinct, touch-discoverable per-verse
  // details control, so the overlay has a non-tap entry point alongside the tap.
  onSelectVerse?: (verseKey: string) => void;
  // When true (the default), the verse currently being recited by a
  // segment-capable reciter gets the word-sync highlight (TajweedFollowText);
  // every other verse keeps the plain TajweedText. The reader toolbar toggle
  // (Plan 04) threads this in so a learner can turn the highlight off; off
  // renders today's TajweedText for every verse.
  followAlong?: boolean;
  // Reveal-as-recited: when true, the verse being recited (with alignable
  // segments) is blurred and each word uncovers as it is recited, driven by the
  // same active-word index as the highlight. Fed by the verse-overlay toggle
  // (threaded from MushafReader). It also turns the recall whole-verse blur into a
  // per-word uncover for a memorized playing verse; without segments (or when the
  // toggle is off) both paths keep the existing whole-verse blur. In-session only.
  revealAsRecited?: boolean;
}

export function MushafPage({ data, memorizationMode = false, targetVerseKey = null, onPlayVerse, onSelectVerse, followAlong = true, revealAsRecited = false }: MushafPageProps) {
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

  // The follow-along controller, read ONCE here (it subscribes narrowly to media
  // time so the whole page does not re-render on every tick; only the one playing
  // verse swaps to TajweedFollowText). followKey is the controller's "surah:ayah"
  // under the status !== "idle" predicate, so it persists while paused — unlike
  // playingKey, which drops on pause. segmentCount feeds the highlight's canAlign
  // gate; it is 0 for any segment-less reciter, which silently disables the
  // highlight.
  const { verseKey: followKey, activeIdx, segments } = useFollowAlong();
  const segmentCount = wordCount(segments ?? []);

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
            // The one verse that gets the word-sync highlight: the controller's
            // playing verse (persists on pause), only when follow-along is on and
            // its segments are present. Every other verse keeps the plain
            // TajweedText with the rule popover, so the popover still works
            // off the playing verse.
            const followHere = followAlong && v.verseKey === followKey && !!segments;
            // Reveal-as-recited engages for the verse being recited (followHere
            // already requires it is the controller's verse with segments) when
            // either the overlay toggle is on OR it is a memorized verse in recall
            // mode still hidden (hideText). When it engages, TajweedFollowText
            // blurs per word (uncovering up to activeIdx) and drops the whole-verse
            // recall blur on its root via the reveal-active marker; when segments
            // do not align it adds nothing, so the recall path's whole-verse blur
            // below stands as the fallback and the toggle path shows plain text.
            const revealHere = followHere && (revealAsRecited || hideText);
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
                    {followHere ? (
                      // The playing verse: the word-sync highlight layer over the
                      // SAME markup. It renders sanitizeTajweedHtml(tajweedHtml)
                      // unchanged and lights the active word as a separate DOM
                      // layer; a canAlign mismatch inside it falls back to no
                      // highlight. explainRules is dropped only on this one verse
                      // while it plays (the rule popover stays on every other
                      // verse); the same classes keep the layout identical.
                      //
                      // blurUnrevealed turns on reveal-as-recited for this verse:
                      // the layer blurs words ahead of the active one and (via its
                      // reveal-active marker) drops the whole-verse recall blur
                      // below so revealed words show. The hideText whole-verse blur
                      // stays on the element so that when segments do not align the
                      // layer adds no marker and the recall verse stays fully
                      // blurred (the FOLLOW-05 fallback); the Reveal pill remains
                      // the manual escape.
                      <TajweedFollowText
                        tajweedHtml={v.tajweedHtml}
                        activeIdx={activeIdx}
                        segmentCount={segmentCount}
                        blurUnrevealed={revealHere}
                        className={cn(
                          "!leading-[2.6] transition-[filter,opacity] duration-300",
                          hideText && "blur-md opacity-60",
                        )}
                      />
                    ) : (
                      <TajweedText
                        tajweedHtml={v.tajweedHtml}
                        explainRules
                        className={cn(
                          "!leading-[2.6] transition-[filter,opacity] duration-300",
                          hideText && "blur-md opacity-60",
                        )}
                      />
                    )}{" "}
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
                    aria-label={`${noted ? `${t("mushaf.verseActions")}, ${t("notes.hasNote")}` : t("mushaf.verseActions")} (${v.surah}:${v.ayah})`}
                    title={noted ? `${t("mushaf.verseActions")}, ${t("notes.hasNote")}` : t("mushaf.verseActions")}
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
