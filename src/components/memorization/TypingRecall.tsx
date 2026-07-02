"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TajweedText } from "@/components/ui/TajweedText";
import { TajweedFollowText } from "@/components/ui/TajweedFollowText";
import { ArabicText } from "@/components/ui/ArabicText";
import { useMemorization } from "@/hooks/useMemorization";
import { useMemorizationReviews } from "@/hooks/useMemorizationReviews";
import { useSettings } from "@/hooks/useSettings";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";
import { getVerseSnapshotByKey } from "@/lib/verse-snapshots";
import { getTajweedSurah, getBundledChaptersIndex, getWordsForChapter } from "@/lib/quran-api";
import { canAlign } from "@/lib/follow-along";
import { sanitizeTajweedHtml } from "@/lib/sanitize";
import { wordsMatch } from "@/lib/word-compare";
import { toArabicIndic, cn } from "@/lib/utils";
import type { RecallGrade, VerseWord } from "@/lib/types";

// Surah headers from the bundled index (READ ONLY) so a verse can show its surah
// name without a network round-trip; never edits or generates.
const SURAHS = getBundledChaptersIndex();
const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

// The manuscript-token bordered box the growing prefix renders inside, matching
// the other drills' verse frames.
const VERSE_BOX =
  "rounded-xl border border-gold-light/30 bg-bg-subtle/30 p-4 text-center dark:border-gold-dark/20 dark:bg-bg-subtle-dark/30";

const SELECT_CLASS =
  "w-full text-small bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]";

// The typing input: RTL Arabic entry on the same manuscript tokens as the picker
// select, sized for touch. dir="rtl" lang="ar" so the learner types Arabic in the
// correct direction with the Arabic font.
const INPUT_CLASS =
  "w-full font-arabic text-arabic-md bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-3 py-2 min-h-[52px] text-center";

// Sort verseKeys ("s:a") numerically by surah then ayah, so the picker reads in
// mushaf order rather than string order (which mis-sorts 10 before 2).
function compareVerseKeys(a: string, b: string): number {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
}

// A CONSERVATIVE visual-word count of the tajweed HTML: drop the trailing
// ayah-number <span class="end">…</span>, strip the remaining tags, and split the
// text on whitespace. Identical to SegmentDrill's tier probe — always >= the
// renderer's group count, so it can only PREFER the safe Tier 2 plain fallback,
// never leak the hidden target through a mis-aligned Tier 1. READ-ONLY over the
// SAME sanitized markup — no edit, no recolor.
function visualWordCount(tajweedHtml: string): number {
  const safe = sanitizeTajweedHtml(tajweedHtml);
  const withoutEnd = safe.replace(/<span class="end">[\s\S]*?<\/span>/g, " ");
  const text = withoutEnd.replace(/<[^>]+>/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// The growing-prefix reveal frame. Tier 1 renders the FULL verse tajweed through
// TajweedFollowText with a revealRange window (blurring every word outside
// [start..end]) so color is preserved and the markup is never edited; end === -1
// (word 0) blurs the whole verse. Tier 2 (canAlign mismatch) falls back to the
// verified word text of the revealed window joined plainly via ArabicText, so the
// prefix is ALWAYS shown without ever exposing the hidden target. Copied verbatim
// from SegmentDrill's ChunkReveal.
function PrefixReveal({
  session,
  range,
}: {
  session: DrillSession;
  range: { start: number; end: number };
}) {
  const inner =
    session.tier === 1 ? (
      <TajweedFollowText
        tajweedHtml={session.tajweedHtml}
        activeIdx={-1}
        segmentCount={session.realWordCount}
        revealRange={range}
        size="lg"
        className="block"
      />
    ) : (
      <ArabicText
        text={session.realWords
          .slice(range.start, range.end + 1)
          .map((w) => w.textUthmani)
          .join(" ")}
        quran
        size="lg"
        className="block"
      />
    );
  return <div className={VERSE_BOX}>{inner}</div>;
}

// The frozen per-verse snapshot captured once when the learner starts a drill.
// realWords / realWordCount are the 06-02 end-marker-filtered word list — the
// exact-match typing target (VerseWord.textUthmani carries tashkeel). tier decides
// the reveal path. Mid-session memorization changes never re-seed this (mirrors
// the other drills' snapshot-once invariant); the picker's effectiveKey fallback
// keeps an unmemorized mid-session pick from ever seeding a new one.
interface DrillSession {
  verseKey: string;
  surah: number;
  ayah: number;
  surahLabel: string;
  refLabel: string;
  realWords: VerseWord[];
  realWordCount: number;
  tajweedHtml: string;
  tier: 1 | 2;
}

type Phase = "picker" | "loading" | "error" | "typing" | "grade";
type Feedback = "none" | "wrong" | "correct";

// The typing-recall drill: the FOURTH keyboard drill on /progress. Pick a
// memorized verse, then type its words one at a time from memory. Each submission
// is checked by wordsMatch against the stored verified textUthmani — exact by
// default, diacritic-insensitive when settings.diacriticInsensitive is on (TYPE-01
// / TYPE-02). A match advances and grows the revealed prefix; a mismatch shows
// feedback and offers Retry or Reveal-this-word (both count as a mistake, neither
// writes). At verse end the four SM-2 grade buttons record ONE recordReview per
// verse (TYPE-03: the ONLY write; the comparison strips copies and no path
// rewrites verse text). It reuses SegmentDrill's session skeleton verbatim — the
// DrillSession snapshot, loadSeq guard, tier probe, PrefixReveal, the
// rootRef.contains + INPUT/TEXTAREA keydown guard (grade phase ONLY), and the
// focus loop — so the typing input needs no new keyboard guard: the other drills'
// keys-1-4 handlers already early-return on a focused INPUT, and this drill's own
// grade-key listener is live only at the grade phase. Distinct typing.* labels +
// role="region" keep its /progress locators unambiguous.
export function TypingRecall() {
  const { t, isAr } = useTranslation();
  const { memorized, mounted } = useMemorization();
  const { recordReview, preview } = useMemorizationReviews();
  const { settings } = useSettings();

  const [selectedKey, setSelectedKey] = useState("");
  const [phase, setPhase] = useState<Phase>("picker");
  const [session, setSession] = useState<DrillSession | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [mistakeCount, setMistakeCount] = useState(0);
  // Whether the current target word has been revealed as an assist (a mistake);
  // when true the input is replaced by the word plus a Next control to advance.
  const [revealed, setRevealed] = useState(false);

  const continueRef = useRef<HTMLButtonElement | null>(null);
  const nextWordRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Guards against a slow start() load being applied after a newer start/reset.
  const loadSeq = useRef(0);

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  const verseMeta = useCallback(
    (key: string) => {
      const [s, a] = key.split(":").map(Number);
      const header = SURAH_BY_NUMBER.get(s);
      const surahLabel = header ? (isAr ? header.nameArabic : header.nameSimple) : "";
      const refLabel = isAr ? `${toArabicIndic(s)}:${toArabicIndic(a)}` : `${s}:${a}`;
      return { surahLabel, refLabel };
    },
    [isAr],
  );

  // The memorized verses in mushaf order for the picker; the effective selection
  // falls back to the first verse when nothing is chosen or the choice was
  // unmemorized between renders (reconcile-in-render, so a mid-session unmark of
  // the picker choice never seeds a broken session).
  const memorizedList = useMemo(
    () => Array.from(memorized).sort(compareVerseKeys),
    [memorized],
  );
  const effectiveKey = memorizedList.includes(selectedKey)
    ? selectedKey
    : memorizedList[0] ?? "";

  // Return to the pre-start picker; invalidates any in-flight load so a late
  // resolve cannot revive a stale session.
  const reset = useCallback(() => {
    loadSeq.current += 1;
    setPhase("picker");
    setSession(null);
    setWordIndex(0);
    setTyped("");
    setFeedback("none");
    setMistakeCount(0);
    setRevealed(false);
  }, []);

  // Resolve the chosen verse's REAL word list (06-02 filtered) — the exact-match
  // typing target — and its tajweed HTML (snapshot-first, else the cached surah
  // fetch) for the growing-prefix reveal, then snapshot them. No audio segments:
  // typing is compared against textUthmani, not word timing.
  const start = useCallback(async () => {
    const key = effectiveKey;
    if (!key) return;
    const seq = ++loadSeq.current;
    const [surah, ayah] = key.split(":").map(Number);
    setSession(null);
    setWordIndex(0);
    setTyped("");
    setFeedback("none");
    setMistakeCount(0);
    setRevealed(false);
    setPhase("loading");
    try {
      const snapshot = getVerseSnapshotByKey(key);
      const [wordsByKey, tajweedHtml] = await Promise.all([
        getWordsForChapter(surah),
        snapshot
          ? Promise.resolve(snapshot.tajweedHtml)
          : getTajweedSurah(surah).then(
              (verses) => verses.find((v) => v.verseKey === key)?.tajweedHtml ?? null,
            ),
      ]);
      if (seq !== loadSeq.current) return;
      const realWords = wordsByKey[key] ?? [];
      const realWordCount = realWords.length;
      if (!tajweedHtml || realWordCount === 0) {
        setPhase("error");
        return;
      }
      // Tier 1 when the whitespace-derived visual-word count matches the real-word
      // count (TajweedFollowText's own canAlign will then engage); else Tier 2.
      const tier: 1 | 2 = canAlign(realWordCount, visualWordCount(tajweedHtml)) ? 1 : 2;
      const meta = verseMeta(key);
      setSession({
        verseKey: key,
        surah,
        ayah,
        surahLabel: meta.surahLabel,
        refLabel: meta.refLabel,
        realWords,
        realWordCount,
        tajweedHtml,
        tier,
      });
      setPhase("typing");
    } catch {
      if (seq === loadSeq.current) setPhase("error");
    }
  }, [effectiveKey, verseMeta]);

  // Play the whole verse (optional assist), through the ONE player engine — no
  // second <audio> element, and no sub-verse loop (typing is word-by-word from
  // memory, not audio-timed).
  const playVerse = useCallback(() => {
    if (!session) return;
    usePlayer.getState().playVerse(session.surah, session.ayah, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: session.surahLabel || null,
    });
  }, [session, settings.reciter, settings.playbackSpeed]);

  // Advance to the next word after a match or a reveal: clear the input and the
  // per-word feedback/reveal state, then either move to the next word or, once the
  // last word is done, to the single end-of-verse grade. NEVER writes storage or
  // content — advancing is pure UI state.
  const advanceWord = useCallback(() => {
    if (!session) return;
    const next = wordIndex + 1;
    setTyped("");
    setFeedback("none");
    setRevealed(false);
    if (next >= session.realWordCount) setPhase("grade");
    else setWordIndex(next);
  }, [session, wordIndex]);

  // Check the typed word against the stored verified textUthmani. Comparison-only:
  // wordsMatch strips COPIES; a mismatch shows feedback and records NOTHING (no
  // storage write, no content rewrite — TYPE-03). A match advances the prefix.
  const check = useCallback(() => {
    if (!session) return;
    // A stray empty/whitespace submit (e.g. Enter on the auto-focused input) is a
    // no-op, NOT a mistake — otherwise it would wrongly cap a fully-recalled verse.
    if (!typed.trim()) return;
    const target = session.realWords[wordIndex]?.textUthmani ?? "";
    const ok = wordsMatch(typed, target, {
      diacriticInsensitive: settings.diacriticInsensitive ?? false,
    });
    if (ok) {
      // advanceWord resets feedback to "none"; set "correct" after so the aria-live
      // region announces the match to screen readers (cleared on the next keystroke).
      advanceWord();
      setFeedback("correct");
    } else {
      setFeedback("wrong");
      setMistakeCount((c) => c + 1);
    }
  }, [session, wordIndex, typed, settings.diacriticInsensitive, advanceWord]);

  // Reveal the current word as an assist (counts as a mistake); the learner then
  // advances with the Next control. Shows the verified word via ArabicText — never
  // rewrites it.
  const revealWord = useCallback(() => {
    setFeedback("none");
    setRevealed(true);
    setMistakeCount((c) => c + 1);
  }, []);

  // Clear the wrong attempt and let the learner retype the same word.
  const retry = useCallback(() => {
    setTyped("");
    setFeedback("none");
  }, []);

  // The single end-of-verse grade (TYPE-03: the ONLY storage write in this
  // component). Records ONCE through the shared memorizationReviews SM-2 keyspace,
  // then returns to the picker. No per-word grade; recall-scheduler UNCHANGED.
  const submitGrade = useCallback(
    (g: RecallGrade) => {
      if (!session) return;
      recordReview(session.verseKey, g);
      reset();
    },
    [session, recordReview, reset],
  );

  // Keep the keyboard loop closed. While typing, focus the input (so Enter submits
  // and 1-4 land in the field, never on a drill's grade listener); after a reveal,
  // focus the Next control; at the grade phase focus the primary grade button.
  // Skipped on picker/loading/error, which own their own controls.
  useEffect(() => {
    if (phase === "typing") {
      if (revealed) nextWordRef.current?.focus();
      else inputRef.current?.focus();
    } else if (phase === "grade") {
      continueRef.current?.focus();
    }
  }, [phase, revealed, wordIndex, feedback]);

  // Keys 1-4 grade the whole verse (again/hard/good/easy), matching the button
  // order — LIVE ONLY at the grade phase, the smallest possible cross-fire surface.
  // Scoped to the focused drill: /progress shows four keyboard drills at once, so
  // without the rootRef.contains(activeElement) guard one keypress would grade more
  // than one and corrupt the shared SM-2 schedule. The INPUT/TEXTAREA guard is kept
  // verbatim from SegmentDrill even though the input is unmounted at grade, so a
  // future edit cannot regress. Copied verbatim from SegmentDrill.
  useEffect(() => {
    if (phase !== "grade" || !session) return;
    const KEY_TO_GRADE: Record<string, RecallGrade> = {
      "1": "again",
      "2": "hard",
      "3": "good",
      "4": "easy",
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (!rootRef.current?.contains(document.activeElement)) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const g = KEY_TO_GRADE[e.key];
      if (!g) return;
      e.preventDefault();
      submitGrade(g);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, session, submitGrade]);

  // Gate the whole surface on the memorization mounted flag so the server and first
  // client paint agree (the /progress page also gates on mount + count).
  if (!mounted) return null;

  if (phase === "picker") {
    return (
      <Card className="space-y-4">
        <div className="space-y-1 text-center">
          <h3 className="font-heading text-lg font-semibold">{t("typing.title")}</h3>
          <p className="text-sm text-text-muted">{t("typing.description")}</p>
        </div>
        {memorizedList.length === 0 ? (
          <p className="text-center text-sm text-text-muted">{t("typing.empty")}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="typing-verse" className="block text-sm font-medium">
                {t("typing.pickVerse")}
              </label>
              <select
                id="typing-verse"
                value={effectiveKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                aria-label={t("typing.pickVerse")}
                className={SELECT_CLASS}
              >
                {memorizedList.map((key) => {
                  const m = verseMeta(key);
                  return (
                    <option key={key} value={key}>
                      {m.surahLabel} {m.refLabel}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="text-center">
              <Button onClick={start} size="lg">
                {t("typing.startDrill")}
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  }

  if (phase === "loading") {
    return (
      <Card className="space-y-4">
        <TajweedText tajweedHtml="" loading className="block text-center" />
      </Card>
    );
  }

  if (phase === "error" || !session) {
    return (
      <Card className="space-y-4 text-center">
        <p className="text-sm text-text-muted">{t("reading.unavailable")}</p>
        <Button onClick={reset}>{t("practice.tryAgain")}</Button>
      </Card>
    );
  }

  // The effective next interval each rating would schedule for the whole verse,
  // shown under each grade button (only rendered at the grade phase).
  const intervals = preview(session.verseKey);
  // The post-reveal focus target lands on "hard" when the learner needed help this
  // verse (so an honest lower grade is one keystroke away) and on "good" otherwise
  // — a gentle nudge, never an auto-write. Mirrors MemorizedReview's peeked focus.
  const focusGrade: RecallGrade = mistakeCount > 0 ? "hard" : "good";
  const gradeButtons: {
    grade: RecallGrade;
    labelKey: string;
    variant: "primary" | "outline";
    className: string;
  }[] = [
    {
      grade: "again",
      labelKey: "memorize.gradeAgain",
      variant: "primary",
      className:
        "bg-accent text-white hover:bg-accent/90 dark:bg-accent dark:text-white dark:hover:bg-accent/90",
    },
    { grade: "hard", labelKey: "memorize.gradeHard", variant: "outline", className: "" },
    { grade: "good", labelKey: "memorize.gradeGood", variant: "primary", className: "" },
    {
      grade: "easy",
      labelKey: "memorize.gradeEasy",
      variant: "primary",
      className: "bg-gold text-ink hover:bg-gold-deep",
    },
  ];

  return (
    <Card ref={rootRef} role="region" aria-label={t("typing.title")} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-heading font-semibold">
          {session.surahLabel} <span className="font-mono text-xs text-text-muted">{session.refLabel}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={playVerse} aria-label={t("player.playVerse")}>
          {t("player.playVerse")}
        </Button>
      </div>

      {phase === "typing" && (
        <>
          <ProgressBar value={wordIndex + 1} max={session.realWordCount} showLabel />
          <p className="text-center text-sm font-heading font-semibold">
            {t("typing.progress").replace("{n}", num(wordIndex + 1)).replace("{total}", num(session.realWordCount))}
          </p>
          {/* Growing prefix: words 0..wordIndex-1 shown, the current target and the
              rest hidden. end === -1 (word 0) hides the whole verse. */}
          <PrefixReveal session={session} range={{ start: 0, end: wordIndex - 1 }} />

          {!revealed ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  check();
                }}
                className="space-y-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  dir="rtl"
                  lang="ar"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    if (feedback !== "none") setFeedback("none");
                  }}
                  aria-label={t("typing.inputLabel")}
                  placeholder={t("typing.prompt")}
                  className={INPUT_CLASS}
                />
                <Button type="submit" size="lg" className="w-full">
                  {t("typing.submit")}
                </Button>
              </form>
              {/* The mismatch feedback + escape hatches. aria-live announces the
                  "not quite" line for screen readers; the attempt itself stays in
                  the input above (no separate echo, no markup). Neither control
                  writes anything — Retry clears, Reveal shows the verified word. */}
              <div aria-live="polite" className="min-h-[1.5rem] text-center">
                {feedback === "wrong" && (
                  <p className="text-sm font-medium text-accent">{t("typing.wrong")}</p>
                )}
                {feedback === "correct" && (
                  <p className="text-sm font-medium text-primary">{t("typing.correct")}</p>
                )}
              </div>
              {feedback === "wrong" && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={retry}>
                    {t("typing.retry")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={revealWord}>
                    {t("typing.revealWord")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 text-center">
              {/* The revealed word, verified text via ArabicText — never rewritten. */}
              <div className={VERSE_BOX}>
                <ArabicText text={session.realWords[wordIndex].textUthmani} quran size="lg" className="block" />
              </div>
              <Button ref={nextWordRef} onClick={advanceWord} size="lg" className="w-full">
                {t("common.next")}
              </Button>
            </div>
          )}
        </>
      )}

      {phase === "grade" && (
        <>
          <PrefixReveal session={session} range={{ start: 0, end: session.realWordCount - 1 }} />
          <p className="text-center text-sm font-heading font-semibold">{t("typing.gradePrompt")}</p>
          {mistakeCount > 0 && (
            <p className="text-center text-xs text-text-muted">{t("typing.mistakesNote")}</p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {gradeButtons.map(({ grade: g, labelKey, variant, className }) => {
              const label = t(labelKey);
              const intervalText = t("memorize.gradeIntervalDays").replace("{n}", num(intervals[g]));
              return (
                <Button
                  key={g}
                  ref={g === focusGrade ? continueRef : undefined}
                  variant={variant}
                  onClick={() => submitGrade(g)}
                  aria-label={`${label} · ${intervalText}`}
                  className={cn("h-auto min-h-[52px] flex-col gap-0.5 py-2", className)}
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-xs font-normal opacity-80 tabular-nums">{intervalText}</span>
                </Button>
              );
            })}
          </div>
          <Button variant="ghost" onClick={reset} className="w-full">
            {t("typing.skipGrade")}
          </Button>
        </>
      )}
    </Card>
  );
}
