"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TajweedText } from "@/components/ui/TajweedText";
import { useMemorization } from "@/hooks/useMemorization";
import { useMemorizationReviews } from "@/hooks/useMemorizationReviews";
import { useSettings } from "@/hooks/useSettings";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";
import { getVerseSnapshotByKey } from "@/lib/verse-snapshots";
import { getTajweedSurah, getBundledChaptersIndex } from "@/lib/quran-api";
import { toArabicIndic, cn } from "@/lib/utils";
import {
  verseSeamsForMemorized,
  pageSeamsForMemorized,
  juzSeamsForMemorized,
  type Seam,
} from "@/lib/verse-chaining";
import type { RecallGrade } from "@/lib/types";

// Surah headers from the bundled index (READ ONLY) so a verse can show its surah
// name without a network round-trip; never edits or generates.
const SURAHS = getBundledChaptersIndex();
const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

// The three seam types are ONE relation (head = nextVerse(tail)); they differ
// only in which verses count as a tail. The selector picks the enumerator that
// seeds the session queue over the memorized universe.
type SeamType = "verse" | "page" | "juz";
const SEAM_ENUMERATORS: Record<SeamType, (memorized: Set<string>) => Seam[]> = {
  verse: verseSeamsForMemorized,
  page: pageSeamsForMemorized,
  juz: juzSeamsForMemorized,
};
const SEAM_OPTIONS: { type: SeamType; labelKey: string }[] = [
  { type: "verse", labelKey: "chain.seamVerse" },
  { type: "page", labelKey: "chain.seamPage" },
  { type: "juz", labelKey: "chain.seamJuz" },
];

type FetchLoad =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; tajweedHtml: string }
  | { state: "error" };

// One verse's display text, resolved from the verified snapshot first (computed
// synchronously in render so the offline case never flashes a loader and the
// effect makes no synchronous setState) and otherwise from the existing
// getTajweedSurah fetch path (cached). Never raw, never generated: it renders
// only through TajweedText. Mirrors MemorizedReview's VerseUnderReview; kept as a
// private copy here rather than imported so the two drills stay decoupled.
function VerseLine({ verseKey, blurred }: { verseKey: string; blurred: boolean }) {
  const { t } = useTranslation();
  const snapshot = useMemo(() => getVerseSnapshotByKey(verseKey), [verseKey]);
  const [fetched, setFetched] = useState<FetchLoad>({ state: "idle" });

  useEffect(() => {
    // The snapshot path needs no fetch; resolved synchronously below. The
    // component is keyed by verseKey at the call site, so it remounts per verse
    // and starts from the idle (loader) state, no synchronous reset needed here.
    if (snapshot) return;
    let alive = true;
    const [surah] = verseKey.split(":").map(Number);
    getTajweedSurah(surah)
      .then((verses) => {
        if (!alive) return;
        const hit = verses.find((v) => v.verseKey === verseKey);
        setFetched(
          hit?.tajweedHtml
            ? { state: "ready", tajweedHtml: hit.tajweedHtml }
            : { state: "error" },
        );
      })
      .catch(() => {
        if (alive) setFetched({ state: "error" });
      });
    return () => {
      alive = false;
    };
  }, [verseKey, snapshot]);

  const load: FetchLoad = snapshot
    ? { state: "ready", tajweedHtml: snapshot.tajweedHtml }
    : fetched;

  // The blur is the recall self-test: the HEAD stays hidden until the user
  // reveals it to check. The TAIL cue is never blurred (it is the prompt).
  const blurClass = blurred ? "blur-md opacity-60 select-none" : "";

  if (load.state === "error") {
    return <p className="text-center text-sm text-text-muted">{t("reading.unavailable")}</p>;
  }
  if (load.state !== "ready") {
    return <TajweedText tajweedHtml="" loading className="block text-center" />;
  }
  return (
    <div className={cn("text-center transition", blurClass)} aria-hidden={blurred}>
      <TajweedText tajweedHtml={load.tajweedHtml} size="lg" className="block" />
    </div>
  );
}

// The chaining recall drill: a seam-type selector (verse / page / juz) over the
// learner's memorized verses, mirroring MemorizedReview's proven session shape
// (snapshot the queue ONCE on start, reconcile in pure render, cue → reveal →
// grade with the four SM-2 buttons and keys 1-4). The ONE difference from
// MemorizedReview: the TAIL is an always-visible cue and the HEAD is hidden
// until reveal (two verses shown, only the head blurred). Grading records the
// HEAD via useMemorizationReviews.recordReview into the shared memorizationReviews
// SM-2 keyspace (no storage-schema change), so chaining feeds the same scheduler.
// The audio-tail plays the TAIL verse on the one usePlayer engine (CHAIN-04).
export function ChainingDrill() {
  const { t, isAr } = useTranslation();
  const { memorized, mounted } = useMemorization();
  const { recordReview, preview } = useMemorizationReviews();
  const { settings } = useSettings();

  // The snapshot: the seam queue for the chosen type captured ONCE at start,
  // then frozen. Mid-session memorization changes never re-seed it;
  // reconciliation (below) skips seams whose tail is no longer memorized.
  const [seamType, setSeamType] = useState<SeamType>("verse");
  const [queue, setQueue] = useState<Seam[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const revealRef = useRef<HTMLButtonElement | null>(null);

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

  // Seams available for the selected type over the current memorized set. Drives
  // the pre-start empty-vs-start branch and re-derives as memorized changes.
  const availableSeams = useMemo(
    () => SEAM_ENUMERATORS[seamType](memorized),
    [seamType, memorized],
  );

  const start = useCallback(() => {
    // Snapshot the seams for the chosen type at the instant of start, then freeze
    // it. Each enumerator presents seams whose TAIL is a memorized verse.
    const seams = SEAM_ENUMERATORS[seamType](memorized);
    if (seams.length === 0) return;
    setQueue(seams);
    setIndex(0);
    setReviewed(0);
    setRevealed(false);
    setStarted(true);
  }, [seamType, memorized]);

  // Return to the pre-start selector so the learner can re-pick a seam type
  // before the next session (a bulk-unmark may also have changed what is left).
  const reset = useCallback(() => {
    setStarted(false);
    setRevealed(false);
    setIndex(0);
  }, []);

  // Reconciliation: derive the active step by skipping, in render, any queued
  // seam whose TAIL is no longer memorized (e.g. a bulk-unmark landed
  // mid-session). Pure derivation (no effect mutates the index), identical to
  // MemorizedReview's activeIndex, so a removed seam is never rendered or
  // re-read and the session never throws. currentSeam is undefined once the
  // remaining queue is exhausted (finished).
  const activeIndex = useMemo(() => {
    let i = index;
    while (i < queue.length && !memorized.has(queue[i].tail)) i++;
    return i;
  }, [index, queue, memorized]);
  const currentSeam: Seam | undefined = queue[activeIndex];
  const finished = started && activeIndex >= queue.length;

  const grade = useCallback(
    (g: RecallGrade) => {
      if (!currentSeam) return;
      // Record the HEAD (what was recalled) into the SM-2 keyspace; the scheduler
      // derives the next interval and due date from the rating. The head is
      // recorded unconditionally (RESEARCH Open Question 1) — validated and
      // capped by the storage funnel, never surfaced for an unmemorized key.
      recordReview(currentSeam.head, g);
      setReviewed((n) => n + 1);
      // Advance past the seam just graded; the next render's reconciliation skips
      // any unmarked tails after it and flips to finished when none remain.
      setIndex(activeIndex + 1);
      setRevealed(false);
    },
    [currentSeam, recordReview, activeIndex],
  );

  // Keep the keyboard loop closed across the session: focus lands on Reveal
  // before the head is revealed and on the Good grade button after, so grading
  // (which unmounts the focused grade button and advances) never drops focus to
  // <body>. Skipped on the pre-start and finished states, which own their own
  // controls (Start / Try Again).
  useEffect(() => {
    if (!started || finished) return;
    if (revealed) continueRef.current?.focus();
    else revealRef.current?.focus();
  }, [revealed, activeIndex, started, finished]);

  // Keys 1-4 grade the revealed head (again/hard/good/easy), matching the button
  // order. Active only while revealed; ignores modifier chords and any focused
  // text field. Torn down when not revealed or on unmount.
  useEffect(() => {
    if (!revealed || !currentSeam) return;
    const KEY_TO_GRADE: Record<string, RecallGrade> = {
      "1": "again",
      "2": "hard",
      "3": "good",
      "4": "easy",
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const g = KEY_TO_GRADE[e.key];
      if (!g) return;
      e.preventDefault();
      grade(g);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [revealed, currentSeam, grade]);

  // Audio-tail (CHAIN-04): play the TAIL verse on its own (single mode), through
  // the one player engine — no second audio element, no fabricated audio. The
  // full tail verse is the baseline; the last-words sub-verse loop is deferred.
  const playTail = useCallback(() => {
    if (!currentSeam) return;
    const [s, a] = currentSeam.tail.split(":").map(Number);
    const header = SURAH_BY_NUMBER.get(s);
    usePlayer.getState().playVerse(s, a, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: header ? (isAr ? header.nameArabic : header.nameSimple) : null,
    });
  }, [currentSeam, settings.reciter, settings.playbackSpeed, isAr]);

  // Gate the whole surface on the memorization mounted flag so the server and
  // first client paint agree (the /progress page also gates on mount + count).
  if (!mounted) return null;

  if (!started) {
    return (
      <Card className="space-y-4">
        <div className="space-y-1 text-center">
          <h3 className="font-heading text-lg font-semibold">{t("chain.title")}</h3>
          <p className="text-sm text-text-muted">{t("chain.description")}</p>
        </div>
        <div role="group" aria-label={t("chain.title")} className="flex flex-wrap justify-center gap-2">
          {SEAM_OPTIONS.map(({ type, labelKey }) => (
            <Button
              key={type}
              variant={seamType === type ? "primary" : "outline"}
              size="sm"
              onClick={() => setSeamType(type)}
              aria-pressed={seamType === type}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>
        <div className="text-center">
          {availableSeams.length > 0 ? (
            <Button onClick={start} size="lg">
              {t("review.startReview")}
            </Button>
          ) : (
            <p className="text-sm text-text-muted">{t("chain.empty")}</p>
          )}
        </div>
      </Card>
    );
  }

  if (finished) {
    return (
      <Card className="space-y-4 text-center">
        <h3 className="font-heading text-lg font-semibold">{t("practice.quizComplete")}</h3>
        <p className="text-sm text-text-muted tabular-nums">{num(reviewed)}</p>
        <Button onClick={reset}>{t("practice.tryAgain")}</Button>
      </Card>
    );
  }

  // When not finished, the derived activeIndex guarantees currentSeam is defined
  // and its tail is still memorized; this guard is the type-narrowing belt.
  if (!currentSeam) {
    return <Card className="text-center text-sm text-text-muted">{t("common.loading")}</Card>;
  }

  const tail = verseMeta(currentSeam.tail);
  const head = verseMeta(currentSeam.head);

  // The effective next interval each rating would schedule for the HEAD, from
  // the pure lib (SM-2 + the balanced modifier, applied in the hook). Shown under
  // each button so the learner sees the scheduling feedback before choosing.
  const intervals = preview(currentSeam.head);

  // Four rating buttons in the fixed order again -> hard -> good -> easy, the
  // same order/colors as MemorizedReview: Again red ochre, Hard neutral outline,
  // Good lapis (primary, carries continueRef), Easy gold.
  const gradeButtons: {
    grade: RecallGrade;
    labelKey: string;
    variant: "primary" | "outline";
    className: string;
    ref?: React.Ref<HTMLButtonElement>;
  }[] = [
    {
      grade: "again",
      labelKey: "memorize.gradeAgain",
      variant: "primary",
      className:
        "bg-accent text-white hover:bg-accent/90 dark:bg-accent dark:text-white dark:hover:bg-accent/90",
    },
    { grade: "hard", labelKey: "memorize.gradeHard", variant: "outline", className: "" },
    { grade: "good", labelKey: "memorize.gradeGood", variant: "primary", className: "", ref: continueRef },
    {
      grade: "easy",
      labelKey: "memorize.gradeEasy",
      variant: "primary",
      className: "bg-gold text-ink hover:bg-gold-deep",
    },
  ];

  return (
    <Card className="space-y-4">
      <ProgressBar value={activeIndex + 1} max={queue.length} showLabel />

      {/* The TAIL cue — always visible: the prompt the learner reads from. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-heading font-semibold">
            {t("chain.tailLabel")}: {tail.surahLabel}{" "}
            <span className="font-mono text-xs text-text-muted">{tail.refLabel}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={playTail} aria-label={t("player.playVerse")}>
            {t("player.playVerse")}
          </Button>
        </div>
        <div className="rounded-xl border border-gold-light/30 bg-bg-subtle/30 p-4 dark:border-gold-dark/20 dark:bg-bg-subtle-dark/30">
          <VerseLine key={currentSeam.tail} verseKey={currentSeam.tail} blurred={false} />
        </div>
      </div>

      {/* The HEAD — hidden until reveal: what is being recalled. Its reference is
          withheld until reveal so the label never leaks the answer. */}
      <div className="space-y-2">
        <span className="text-sm font-heading font-semibold">
          {t("chain.headLabel")}:{" "}
          {revealed ? (
            <>
              {head.surahLabel}{" "}
              <span className="font-mono text-xs text-text-muted">{head.refLabel}</span>
            </>
          ) : (
            <span className="text-text-muted">{t("chain.cuePrompt")}</span>
          )}
        </span>
        <div className="rounded-xl border border-gold-light/30 bg-bg-subtle/30 p-4 dark:border-gold-dark/20 dark:bg-bg-subtle-dark/30">
          <VerseLine key={currentSeam.head} verseKey={currentSeam.head} blurred={!revealed} />
        </div>
      </div>

      {!revealed ? (
        <Button ref={revealRef} onClick={() => setRevealed(true)} size="lg" className="w-full">
          {t("mushaf.memorizeReveal")}
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {gradeButtons.map(({ grade: g, labelKey, variant, className, ref }) => {
            const label = t(labelKey);
            const intervalText = t("memorize.gradeIntervalDays").replace("{n}", num(intervals[g]));
            return (
              <Button
                key={g}
                ref={ref}
                variant={variant}
                onClick={() => grade(g)}
                aria-label={`${label} · ${intervalText}`}
                className={cn("h-auto min-h-[52px] flex-col gap-0.5 py-2", className)}
              >
                <span className="font-medium">{label}</span>
                <span className="text-xs font-normal opacity-80 tabular-nums">{intervalText}</span>
              </Button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
