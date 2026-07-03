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
import { useSessionPeeks } from "@/hooks/useSessionPeeks";
import { useTranslation } from "@/lib/i18n";
import { getVerseSnapshotByKey } from "@/lib/verse-snapshots";
import { getTajweedSurah, getBundledChaptersIndex } from "@/lib/quran-api";
import { toArabicIndic, cn } from "@/lib/utils";
import { getSessionPeeks, resetSessionPeeks } from "@/lib/storage";
import { peekRemaining, wasPeeked } from "@/lib/peek-budget";
import { resolveRevisionReciter } from "@/lib/revision-reciter";
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
  const { composeToday, recordReview, preview } = useMemorizationReviews();
  const { settings } = useSettings();
  // Bus-subscribed peek/hint state; the budget math is the pure peek-budget lib.
  const { peeks, record } = useSessionPeeks();

  // The snapshot: due verseKeys captured ONCE at start. Mid-session memorization
  // changes never re-seed it; reconciliation (below) skips removed keys.
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Audio-led (blind) mode: in-session only (never persisted), default OFF so the
  // text-first flow stays the default. When ON, the verse text stays hidden by the
  // existing blur and the audio auto-plays on each advance so the learner recalls
  // from sound, then Reveal shows the text to self-check (BLIND-01).
  const [audioLed, setAudioLed] = useState(false);
  // Latched end-of-session flag: set once the started queue exhausts, cleared only
  // by start(). Keeps a finished session from reverting (and refilling the hint
  // budget) if the memorized set grows mid-session. See the `finished` note below.
  const [ended, setEnded] = useState(false);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const revealRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  const start = useCallback(() => {
    // Snapshot the composed daily-revision queue at the instant of start, then
    // freeze it. composeToday draws the full due set from the memorized Set as
    // the universe (a verse with no review entry is due, so newly memorized
    // verses appear immediately), then caps only the NEW tail at the daily
    // newVerseCap — so the session the learner runs IS the capped queue.
    // `.order` is a verseKey string[], so setQueue and the reconciliation below
    // are unchanged.
    const due = composeToday(memorized).order;
    if (due.length === 0) return;
    setQueue(due);
    setIndex(0);
    setReviewed(0);
    setRevealed(false);
    setEnded(false);
    setStarted(true);
  }, [composeToday, memorized]);

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
  // `finished` is LATCHED via `ended`: once a started session exhausts its snapshot
  // queue it stays finished until the next start(). Deriving it purely from the live
  // queue let a session that ended by unmarking its last verses "un-finish" when the
  // learner re-marked one via the bulk surface on the same page — which refilled the
  // hint budget and un-capped peeked verses (reset-on-finish had already cleared
  // them). Latching keeps the finished screen and the spent budget put.
  const finished = started && (ended || activeIndex >= queue.length);

  // Latch the ended flag the moment the started queue exhausts; start() clears it.
  useEffect(() => {
    if (started && activeIndex >= queue.length) setEnded(true);
  }, [started, activeIndex, queue.length]);

  // Peek/hint budget for this session (BLIND-03). `remaining` counts DISTINCT
  // peeked verses against the budget; `peeked` marks THIS verse as capped at hard.
  // Computed here, above the keyboard effect, so the keys-1-4 handler honors the
  // cap too (a keyboard user must not bypass the disabled good/easy buttons).
  const remaining = peekRemaining(peeks, settings.peekBudget ?? 3);
  const peeked = currentKey ? wasPeeked(peeks, currentKey) : false;

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
      // Grade cap (BLIND-03): a verse peeked this session is capped at hard, so
      // keys 3/4 (good/easy) are a no-op for it, matching the disabled buttons.
      // Without this gate a keyboard user would bypass the visual cap.
      if (peeked && (g === "good" || g === "easy")) return;
      e.preventDefault();
      grade(g);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [revealed, currentKey, grade, peeked]);

  // The revision reciter (PROG-02): resolveRevisionReciter picks
  // settings.revisionReciter when set, else the browse settings.reciter. Passed as
  // opts.reciter below so this recall review can never diverge from the other
  // revision surfaces; the browse reader keeps settings.reciter.
  const revisionReciter = resolveRevisionReciter(settings);

  // Play the verse under review on its own (single mode), through the one player
  // engine, no second audio element is ever constructed here.
  const playCurrent = useCallback(() => {
    if (!currentKey) return;
    const [s, a] = currentKey.split(":").map(Number);
    const header = SURAH_BY_NUMBER.get(s);
    usePlayer.getState().playVerse(s, a, {
      reciter: revisionReciter,
      speed: settings.playbackSpeed,
      surahName: header ? (isAr ? header.nameArabic : header.nameSimple) : null,
    });
  }, [currentKey, revisionReciter, settings.playbackSpeed, isAr]);

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
      reciter: revisionReciter,
      speed: settings.playbackSpeed,
      surahName: null,
    });
  }, [queue, activeIndex, memorized, revisionReciter, settings.playbackSpeed]);

  // Audio-led auto-play (BLIND-01): while in audio-led mode, play the current
  // verse whenever a new one becomes active and is still hidden. The first play
  // rides the Start click and every later one rides the grade-button click that
  // changed currentKey, so the browser's autoplay policy is satisfied (the shared
  // <audio> is already unlocked by that gesture chain). playCurrent routes through
  // the one usePlayer engine; no second audio element is ever constructed.
  useEffect(() => {
    if (audioLed && started && !finished && currentKey && !revealed) playCurrent();
  }, [audioLed, started, finished, currentKey, revealed, playCurrent]);

  // Reset-on-finish is the ONLY peek-budget reset (BLIND-04): clear the session
  // peek map once the session reaches `finished`, never in start(). A reload
  // mid-session drops the React session state and returns to Start, but the
  // persisted map stays, so a reload cannot refill the budget or un-cap a peeked
  // verse. Read getSessionPeeks() DIRECTLY (not the hook state) and key only on
  // `finished`, guarded by a non-empty check, so the change-bus re-read after the
  // clear cannot re-fire this effect into a loop (RESEARCH Pitfall 4): after the
  // clear the map is empty (guard blocks a repeat) and `finished` does not change.
  useEffect(() => {
    if (finished && Object.keys(getSessionPeeks()).length > 0) resetSessionPeeks();
  }, [finished]);

  // The pre-start "N due" label reflects the composed session it will actually
  // run (the capped order length), not the raw uncapped due total, so the label
  // never promises "12 due" then runs a 5-verse capped session.
  const dueNow = useMemo(
    () => composeToday(memorized).order.length,
    [composeToday, memorized],
  );

  if (!started) {
    return (
      <Card className="space-y-4 text-center">
        <h3 className="font-heading text-lg font-semibold">{t("memorize.reviewStart")}</h3>
        {dueNow > 0 ? (
          <div className="space-y-4">
            <label
              className="flex cursor-pointer items-center justify-center gap-2 text-sm"
              title={t("blind.audioLedHint")}
            >
              <input
                type="checkbox"
                checked={audioLed}
                onChange={(e) => setAudioLed(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span>{t("blind.audioLed")}</span>
            </label>
            <Button onClick={start} size="lg">
              {t("review.startReview")}
            </Button>
          </div>
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
  // ochre, Hard neutral outline, Good lapis (primary), Easy gold. The post-reveal
  // focus target (continueRef) is placed in the map below: on good normally, on
  // hard when the verse is peeked (good is disabled then), so the focus loop never
  // lands on a disabled control.
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
        <div className="grid gap-2">
          <Button ref={revealRef} onClick={() => setRevealed(true)} size="lg" className="w-full">
            {t("mushaf.memorizeReveal")}
          </Button>
          {/* The costed hint: reveals the text early as an assist, spends one of the
              per-session budget, and caps this verse at hard. Disabled at 0 left.
              Distinct label from the free "Reveal" so e2e locators never collide. */}
          <Button
            variant="outline"
            disabled={remaining === 0}
            onClick={() => {
              record(currentKey);
              setRevealed(true);
            }}
            aria-label={t("peek.hint")}
            title={
              remaining === 0
                ? t("peek.exhausted")
                : t("peek.remaining").replace("{n}", num(remaining))
            }
            className="w-full"
          >
            {t("peek.hint")} · {num(remaining)}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {gradeButtons.map(({ grade: g, labelKey, variant, className }) => {
            const label = t(labelKey);
            const intervalText = t("memorize.gradeIntervalDays").replace("{n}", num(intervals[g]));
            // Grade cap (BLIND-03): a peeked verse can only be rated again/hard.
            // Disable good/easy, and attach the post-reveal focus (continueRef) to
            // hard instead of the disabled good so focus never falls to <body>.
            const capped = peeked && (g === "good" || g === "easy");
            return (
              <Button
                key={g}
                ref={g === (peeked ? "hard" : "good") ? continueRef : undefined}
                variant={variant}
                disabled={capped}
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
