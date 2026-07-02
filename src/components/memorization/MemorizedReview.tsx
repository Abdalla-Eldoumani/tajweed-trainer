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
import type { RecallGrade } from "@/lib/types";

// Surah headers from the bundled index (READ ONLY) so a verse under review can
// show its surah name without a network round-trip; never edits or generates.
const SURAHS = getBundledChaptersIndex();
const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

type FetchLoad =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; tajweedHtml: string }
  | { state: "error" };

// One verse's display text, resolved from the verified snapshot first (computed
// synchronously in render so the offline case never flashes a loader and the
// effect makes no synchronous setState) and otherwise from the existing
// getTajweedSurah fetch path (cached). Never raw, never generated: it renders
// only through TajweedText.
function VerseUnderReview({ verseKey, blurred }: { verseKey: string; blurred: boolean }) {
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

  // The blur is the recall self-test (the same in-session hide as the reader's
  // recall mode): the verse stays hidden until the user reveals it to check.
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

// A focused recall session over the verses the user has memorized, reusing the
// Leitner machinery through the SEPARATE memorizationReviews keyspace (never the
// rule-quiz reviews map). It mirrors QuizSession's snapshot-at-start shape: the
// due queue is captured once on start and never re-queried mid-session, so a
// bulk-unmark while reviewing cannot corrupt the queue. Each step reconciles in
// place: a verse no longer memorized is skipped, never rendered or re-read.
export function MemorizedReview() {
  const { t, isAr } = useTranslation();
  const { memorized } = useMemorization();
  const { dueMemorized, recordReview, preview } = useMemorizationReviews();
  const { settings } = useSettings();

  // The snapshot: due verseKeys captured ONCE at start. Mid-session memorization
  // changes never re-seed it; reconciliation (below) skips removed keys.
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const revealRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  const start = useCallback(() => {
    // Snapshot the due memorized verses at the instant of start, then freeze it.
    // dueMemorized draws from the memorized Set as the universe and treats a
    // verse with no review entry as due, so newly memorized verses appear
    // immediately.
    const due = dueMemorized(memorized);
    if (due.length === 0) return;
    setQueue(due);
    setIndex(0);
    setReviewed(0);
    setRevealed(false);
    setStarted(true);
  }, [dueMemorized, memorized]);

  // Reconciliation (T-07-13 / AC-16): derive the active step by skipping, in
  // render, any queued verse no longer in the memorized Set (e.g. a bulk-unmark
  // landed mid-session). This is pure derivation (no effect mutates the index),
  // so a removed verse is never rendered or re-read and the session never throws.
  // currentKey is undefined once the remaining queue is exhausted (finished).
  const activeIndex = useMemo(() => {
    let i = index;
    while (i < queue.length && !memorized.has(queue[i])) i++;
    return i;
  }, [index, queue, memorized]);
  const currentKey: string | undefined = queue[activeIndex];
  const finished = started && activeIndex >= queue.length;

  const grade = useCallback(
    (g: RecallGrade) => {
      if (!currentKey) return;
      // Persist the SM-2 result through the separate keyspace; the scheduler
      // derives the next interval and due date from the rating (again resets it).
      recordReview(currentKey, g);
      setReviewed((n) => n + 1);
      // Advance past the verse just graded; the next render's reconciliation skips
      // any unmarked verses after it and flips to finished when none remain.
      setIndex(activeIndex + 1);
      setRevealed(false);
    },
    [currentKey, recordReview, activeIndex],
  );

  // Keep the keyboard loop closed across the whole session: while a verse is up,
  // focus lands on Reveal before it is revealed and on the Good grade button after,
  // so grading (which unmounts the focused grade button and advances to the next
  // verse) never drops focus to <body>. Skipped on the pre-start and finished
  // states, which own their own controls (Start / Try Again).
  useEffect(() => {
    if (!started || finished) return;
    if (revealed) continueRef.current?.focus();
    else revealRef.current?.focus();
  }, [revealed, activeIndex, started, finished]);

  // Keys 1-4 grade the revealed verse (again/hard/good/easy), matching the
  // button order, so a keyboard user never reaches for the mouse. Active only
  // while revealed; ignores modifier chords and any focused text field (there is
  // none here, but guard defensively). Torn down when not revealed or on unmount.
  useEffect(() => {
    if (!revealed || !currentKey) return;
    const KEY_TO_GRADE: Record<string, RecallGrade> = {
      "1": "again",
      "2": "hard",
      "3": "good",
      "4": "easy",
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // Scope 1-4 to the focused drill: /progress can show this review AND the
      // chaining drill at once, both revealed, each with a document keydown
      // listener. Without this guard one keypress would grade BOTH and corrupt
      // the shared schedule. The reveal focus-loop keeps focus inside this card.
      if (!rootRef.current?.contains(document.activeElement)) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const g = KEY_TO_GRADE[e.key];
      if (!g) return;
      e.preventDefault();
      grade(g);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [revealed, currentKey, grade]);

  // Play the verse under review on its own (single mode), through the one player
  // engine, no second audio element is ever constructed here.
  const playCurrent = useCallback(() => {
    if (!currentKey) return;
    const [s, a] = currentKey.split(":").map(Number);
    const header = SURAH_BY_NUMBER.get(s);
    usePlayer.getState().playVerse(s, a, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: header ? (isAr ? header.nameArabic : header.nameSimple) : null,
    });
  }, [currentKey, settings.reciter, settings.playbackSpeed, isAr]);

  // Play the remaining queue as a hand-picked set (multi-verse playback), again
  // through usePlayer, the same engine the reader uses for selections.
  const playQueue = useCallback(() => {
    const items = queue
      .slice(activeIndex)
      .filter((key) => memorized.has(key))
      .map((key) => {
        const [s, a] = key.split(":").map(Number);
        return { surah: s, ayah: a };
      });
    if (items.length === 0) return;
    usePlayer.getState().playSet(items, {
      reciter: settings.reciter,
      speed: settings.playbackSpeed,
      surahName: null,
    });
  }, [queue, activeIndex, memorized, settings.reciter, settings.playbackSpeed]);

  const dueNow = useMemo(
    () => dueMemorized(memorized).length,
    [dueMemorized, memorized],
  );

  if (!started) {
    return (
      <Card className="space-y-4 text-center">
        <h3 className="font-heading text-lg font-semibold">{t("memorize.reviewStart")}</h3>
        {dueNow > 0 ? (
          <Button onClick={start} size="lg">
            {t("review.startReview")}
          </Button>
        ) : (
          <p className="text-sm text-text-muted">{t("memorize.reviewEmpty")}</p>
        )}
      </Card>
    );
  }

  if (finished) {
    return (
      <Card className="space-y-4 text-center">
        <h3 className="font-heading text-lg font-semibold">{t("practice.quizComplete")}</h3>
        <p className="text-sm text-text-muted tabular-nums">{num(reviewed)}</p>
        <Button onClick={start}>{t("practice.tryAgain")}</Button>
      </Card>
    );
  }

  // When not finished, the derived activeIndex guarantees currentKey is defined
  // and still memorized; this guard is the type-narrowing belt-and-suspenders.
  if (!currentKey) {
    return <Card className="text-center text-sm text-text-muted">{t("common.loading")}</Card>;
  }

  const [s, a] = currentKey.split(":").map(Number);
  const header = SURAH_BY_NUMBER.get(s);
  const surahLabel = header ? (isAr ? header.nameArabic : header.nameSimple) : "";
  const refLabel = isAr ? `${toArabicIndic(s)}:${toArabicIndic(a)}` : `${s}:${a}`;

  // The effective next interval each rating would schedule for this verse, from
  // the pure lib (SM-2 + the balanced modifier, applied in the hook). Shown under
  // each button so the learner sees the scheduling feedback before choosing.
  const intervals = preview(currentKey);

  // Four rating buttons in the fixed order again -> hard -> good -> easy. Colors
  // convey difficulty through the manuscript tokens (no garish hues): Again red
  // ochre, Hard neutral outline, Good lapis (primary), Easy gold. Good carries
  // continueRef so the reveal moves focus onto a grade control, not back on Reveal.
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
    <Card ref={rootRef} role="region" aria-label={t("memorize.reviewStart")} className="space-y-4">
      <ProgressBar value={activeIndex + 1} max={queue.length} showLabel />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-heading font-semibold">
          {surahLabel} <span className="font-mono text-xs text-text-muted">{refLabel}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={playCurrent} aria-label={t("player.playVerse")}>
            {t("player.playVerse")}
          </Button>
          <Button variant="ghost" size="sm" onClick={playQueue} aria-label={t("player.playSelection")}>
            {t("player.playSelection")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gold-light/30 bg-bg-subtle/30 p-4 dark:border-gold-dark/20 dark:bg-bg-subtle-dark/30">
        <VerseUnderReview key={currentKey} verseKey={currentKey} blurred={!revealed} />
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
