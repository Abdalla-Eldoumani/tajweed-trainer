"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TajweedText } from "@/components/ui/TajweedText";
import { useMemorization } from "@/hooks/useMemorization";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { getVerseSnapshotByKey } from "@/lib/verse-snapshots";
import { getTajweedSurah, getBundledChaptersIndex } from "@/lib/quran-api";
import { versesForSurah, versesForJuz, versesForRange } from "@/lib/memorization-scope";
import { ayahCountForSurah, TOTAL_JUZ } from "@/lib/navigation";
import { logExamResult } from "@/lib/storage";
import { toArabicIndic } from "@/lib/utils";

// Surah headers from the bundled index (READ ONLY) so the scope picker can name
// surahs and the running verse can show its surah name without a network
// round-trip; never edits or generates.
const SURAHS = getBundledChaptersIndex();
const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

// The verse picker / scope selects, on the same manuscript tokens as the other
// drills.
const SELECT_CLASS =
  "w-full text-small bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]";

// A short numeric input for the range ayah bounds, sized for touch on the same
// tokens as the selects.
const NUMBER_CLASS =
  "w-full text-small bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px] tabular-nums";

// The bordered box the revealed verse renders inside (only shown AFTER a mark),
// matching the other drills' verse frames.
const VERSE_BOX =
  "rounded-xl border border-gold-light/30 bg-bg-subtle/30 p-4 text-center dark:border-gold-dark/20 dark:bg-bg-subtle-dark/30";

type ScopeType = "surah" | "juz" | "range";
type Phase = "pick" | "exam" | "summary";
type Mark = "recalled" | "missed" | null;

// The timed, no-peek, self-graded exam on /progress (EXAM-02). It is a
// MEASUREMENT, not a teaching drill: pick a scope (surah / juz / range), run a
// TIMED session over that scope's memorized verses with each verse HIDDEN
// (no-peek) until the learner self-marks recalled / missed, reveal the text only
// afterward as a check, then log a percent-recalled score. It touches NEITHER the
// SM-2 recall schedule NOR the revision streak, never machine-scores recitation,
// and has NO document-level key handler — every action is a button, so it cannot
// cross-fire the other /progress drills' grade keys. Verse text renders ONLY
// through TajweedText from the verified snapshot/API (never generated). Distinct
// exam.* labels; numbers via toArabicIndic in AR; gated on the memorization
// mounted flag so the server and first client paint agree.
export function ExamMode() {
  const { t, isAr } = useTranslation();
  const { memorized, mounted } = useMemorization();
  // The recent-attempts list lives on progress.examLog; reading it through
  // useProgress means the summary re-renders through the change bus after a log.
  const { progress } = useProgress();

  const [scopeType, setScopeType] = useState<ScopeType>("surah");
  // The learner's own picks, or null to track a memorized-content default (like
  // TypingRecall's effectiveKey) so the picker starts on something useful without
  // an effect-driven sync.
  const [surahChoice, setSurahChoice] = useState<number | null>(null);
  const [juz, setJuz] = useState(1);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(7);

  const [phase, setPhase] = useState<Phase>("pick");
  // The scope's memorized verses, frozen ONCE on begin so a mid-exam memorization
  // change never reshapes the running measurement.
  const [examVerses, setExamVerses] = useState<string[]>([]);
  const [scopeLabel, setScopeLabel] = useState("");
  const [verseIdx, setVerseIdx] = useState(0);
  const [mark, setMark] = useState<Mark>(null);
  const [revealed, setRevealed] = useState(false);
  const [recalled, setRecalled] = useState(0);
  const [attempted, setAttempted] = useState(0);
  // The async-fetched tajweed markup for a verse WITHOUT a bundled snapshot,
  // tagged with its verseKey so a stale resolve is never shown for a new verse.
  // ("" = unavailable.) Verses with a snapshot resolve synchronously in render.
  const [fetched, setFetched] = useState<{ key: string; html: string } | null>(null);
  // In-session elapsed seconds — display only, NEVER persisted.
  const [elapsed, setElapsed] = useState(0);

  // The interval id + the session start epoch, both ref-held so the 1s tick can
  // be cleared on finish/unmount without re-arming across renders.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startEpochRef = useRef(0);
  // Guards a slow reveal-html load from being applied after a newer verse/reset.
  const loadSeq = useRef(0);
  // Ensures the attempt is logged exactly once per summary (StrictMode-safe).
  const loggedRef = useRef(false);

  const num = useCallback((n: number) => (isAr ? toArabicIndic(n) : String(n)), [isAr]);

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

  // The memorized verses in mushaf order, only used to seed a sensible default
  // surah for the picker (the first memorized verse's surah).
  const firstMemorizedSurah = useMemo(() => {
    let best = Infinity;
    for (const vk of memorized) {
      const s = Number(vk.split(":")[0]);
      if (s < best) best = s;
    }
    return Number.isFinite(best) ? best : 1;
  }, [memorized]);
  const surah = surahChoice ?? firstMemorizedSurah;
  const ayahCount = ayahCountForSurah(surah);

  // The chosen scope's verse keys (already in mushaf order), and the memorized
  // subset the exam will actually run over.
  const scopeVerses = useMemo(() => {
    if (scopeType === "surah") return versesForSurah(surah);
    if (scopeType === "juz") return versesForJuz(juz);
    return versesForRange(surah, rangeStart, rangeEnd);
  }, [scopeType, surah, juz, rangeStart, rangeEnd]);
  const inScope = useMemo(
    () => scopeVerses.filter((vk) => memorized.has(vk)),
    [scopeVerses, memorized],
  );

  // A human scope label (e.g. "Al-Baqarah" / "Juz 3" / "2:1-2:20") stored on the
  // attempt and shown in the recent list. Built in the current locale.
  const buildScopeLabel = useCallback((): string => {
    if (scopeType === "surah") {
      const h = SURAH_BY_NUMBER.get(surah);
      return h ? (isAr ? h.nameArabic : h.nameSimple) : num(surah);
    }
    if (scopeType === "juz") {
      return t("exam.juzLabel").replace("{n}", num(juz));
    }
    // Clamp the label bounds to the surah's real ayah count so the logged label
    // matches the set versesForRange actually tests (e.g. a 108:1-100 pick tests
    // and must read 108:1-3, not overstate the range).
    const a = Math.min(Math.max(1, Math.min(rangeStart, rangeEnd)), ayahCount);
    const b = Math.min(Math.max(1, Math.max(rangeStart, rangeEnd)), ayahCount);
    const raw = `${surah}:${a}-${surah}:${b}`;
    return isAr ? toArabicIndic(raw) : raw;
  }, [scopeType, surah, juz, rangeStart, rangeEnd, ayahCount, isAr, num, t]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clear the interval on unmount so an abandoned exam never keeps ticking (the
  // elapsed value is display-only and never persisted, so nothing else to clean).
  useEffect(() => stopTimer, [stopTimer]);

  // The verse under review while in the exam phase.
  const currentKey = phase === "exam" ? examVerses[verseIdx] : undefined;

  // The bundled snapshot resolves SYNCHRONOUSLY in render (no loader flash, no
  // setState-in-effect); a verse without one falls back to the async fetch below.
  const snapshotHtml = useMemo(() => {
    if (!currentKey) return null;
    const snap = getVerseSnapshotByKey(currentKey);
    return snap ? snap.tajweedHtml : null;
  }, [currentKey]);

  // Resolve the current verse's tajweed markup while the learner decides, so the
  // post-mark reveal is instant. It is RENDERED only after a mark; fetching it
  // here never shows the text. setState lives only in the async resolve (never
  // synchronously in the effect body — the snapshot path already covers that).
  useEffect(() => {
    if (!currentKey || snapshotHtml !== null) return;
    const seq = ++loadSeq.current;
    const [s] = currentKey.split(":").map(Number);
    getTajweedSurah(s)
      .then((verses) => {
        if (seq === loadSeq.current) {
          setFetched({ key: currentKey, html: verses.find((v) => v.verseKey === currentKey)?.tajweedHtml ?? "" });
        }
      })
      .catch(() => {
        if (seq === loadSeq.current) setFetched({ key: currentKey, html: "" });
      });
  }, [currentKey, snapshotHtml]);

  // The markup to reveal for the current verse: the snapshot if present, else the
  // fetched html ONLY when it belongs to this verse (else null = still loading).
  const revealHtml =
    snapshotHtml ?? (fetched && fetched.key === currentKey ? fetched.html : null);

  // Begin a timed session over the frozen in-scope memorized verses. Runs off the
  // Start button's user gesture. Starts the 1s elapsed tick in a ref.
  const begin = useCallback(() => {
    if (inScope.length === 0) return;
    loadSeq.current += 1;
    loggedRef.current = false;
    setExamVerses(inScope);
    setScopeLabel(buildScopeLabel());
    setVerseIdx(0);
    setMark(null);
    setRevealed(false);
    setRecalled(0);
    setAttempted(0);
    setFetched(null);
    setElapsed(0);
    startEpochRef.current = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsed(Math.max(0, Math.round((Date.now() - startEpochRef.current) / 1000)));
    }, 1000);
    setPhase("exam");
  }, [inScope, buildScopeLabel, stopTimer]);

  // Self-mark the current verse recalled or missed (increments attempted once —
  // the mark buttons unmount after a mark, so a verse can never be double-counted).
  const doMark = useCallback((recalledFlag: boolean) => {
    setMark(recalledFlag ? "recalled" : "missed");
    setAttempted((a) => a + 1);
    if (recalledFlag) setRecalled((r) => r + 1);
  }, []);

  // Reveal the marked verse's text as a self-check (only reachable after a mark).
  const reveal = useCallback(() => setRevealed(true), []);

  // Stop the timer and move to the summary; the log fires once from the summary
  // effect below, reading the final tallies.
  const finishExam = useCallback(() => {
    stopTimer();
    setPhase("summary");
  }, [stopTimer]);

  // Advance to the next verse (resetting the per-verse mark/reveal), or finish
  // after the last one.
  const advance = useCallback(() => {
    const next = verseIdx + 1;
    if (next >= examVerses.length) {
      finishExam();
      return;
    }
    setVerseIdx(next);
    setMark(null);
    setRevealed(false);
  }, [verseIdx, examVerses.length, finishExam]);

  // Abandon a running exam and return to the picker WITHOUT logging (only a
  // completed exam that reaches the summary logs an attempt).
  const restart = useCallback(() => {
    loadSeq.current += 1;
    loggedRef.current = false;
    stopTimer();
    setPhase("pick");
    setExamVerses([]);
    setVerseIdx(0);
    setMark(null);
    setRevealed(false);
    setRecalled(0);
    setAttempted(0);
    setFetched(null);
    setElapsed(0);
  }, [stopTimer]);

  // Log the finished attempt exactly once when the summary opens. percent guards
  // the zero divide (0 attempted -> 0%); logExamResult itself clamps/rounds and
  // caps the log. A measurement only — no SM-2 write, no streak touch.
  useEffect(() => {
    if (phase !== "summary" || loggedRef.current) return;
    loggedRef.current = true;
    const percent = attempted > 0 ? Math.round((recalled / attempted) * 100) : 0;
    logExamResult({ scope: scopeLabel, percent, total: attempted });
  }, [phase, attempted, recalled, scopeLabel]);

  const formatElapsed = useCallback(
    (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      const raw = `${m}:${String(s).padStart(2, "0")}`;
      return isAr ? toArabicIndic(raw) : raw;
    },
    [isAr],
  );

  // Gate the whole surface on the memorization mounted flag so the server and
  // first client paint agree (the /progress page also gates on mount + count).
  if (!mounted) return null;

  if (phase === "pick") {
    const scopeTabs: { type: ScopeType; labelKey: string }[] = [
      { type: "surah", labelKey: "exam.scopeSurah" },
      { type: "juz", labelKey: "exam.scopeJuz" },
      { type: "range", labelKey: "exam.scopeRange" },
    ];
    return (
      <Card className="space-y-4">
        <div className="space-y-1 text-center">
          <h3 className="font-heading text-lg font-semibold">{t("exam.title")}</h3>
          <p className="text-sm text-text-muted">{t("exam.description")}</p>
        </div>

        <div className="space-y-1">
          <span className="block text-sm font-medium">{t("exam.pickScope")}</span>
          <div role="group" aria-label={t("exam.pickScope")} className="flex flex-wrap gap-2">
            {scopeTabs.map(({ type, labelKey }) => (
              <Button
                key={type}
                variant={scopeType === type ? "primary" : "outline"}
                size="sm"
                onClick={() => setScopeType(type)}
                aria-pressed={scopeType === type}
              >
                {t(labelKey)}
              </Button>
            ))}
          </div>
        </div>

        {(scopeType === "surah" || scopeType === "range") && (
          <div className="space-y-1">
            <label htmlFor="exam-surah" className="block text-sm font-medium">
              {t("exam.chooseSurah")}
            </label>
            <select
              id="exam-surah"
              value={surah}
              onChange={(e) => setSurahChoice(Number(e.target.value))}
              aria-label={t("exam.chooseSurah")}
              className={SELECT_CLASS}
            >
              {SURAHS.map((s) => (
                <option key={s.number} value={s.number}>
                  {num(s.number)}. {isAr ? s.nameArabic : s.nameSimple}
                </option>
              ))}
            </select>
          </div>
        )}

        {scopeType === "juz" && (
          <div className="space-y-1">
            <label htmlFor="exam-juz" className="block text-sm font-medium">
              {t("exam.chooseJuz")}
            </label>
            <select
              id="exam-juz"
              value={juz}
              onChange={(e) => setJuz(Number(e.target.value))}
              aria-label={t("exam.chooseJuz")}
              className={SELECT_CLASS}
            >
              {Array.from({ length: TOTAL_JUZ }, (_, i) => i + 1).map((j) => (
                <option key={j} value={j}>
                  {t("exam.juzLabel").replace("{n}", num(j))}
                </option>
              ))}
            </select>
          </div>
        )}

        {scopeType === "range" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="exam-range-start" className="block text-sm font-medium">
                {t("exam.rangeStart")}
              </label>
              <input
                id="exam-range-start"
                type="number"
                inputMode="numeric"
                min={1}
                max={ayahCount}
                value={rangeStart}
                onChange={(e) =>
                  setRangeStart(Math.min(ayahCount, Math.max(1, Math.floor(Number(e.target.value)) || 1)))
                }
                aria-label={t("exam.rangeStart")}
                className={NUMBER_CLASS}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="exam-range-end" className="block text-sm font-medium">
                {t("exam.rangeEnd")}
              </label>
              <input
                id="exam-range-end"
                type="number"
                inputMode="numeric"
                min={1}
                max={ayahCount}
                value={rangeEnd}
                onChange={(e) =>
                  setRangeEnd(Math.min(ayahCount, Math.max(1, Math.floor(Number(e.target.value)) || 1)))
                }
                aria-label={t("exam.rangeEnd")}
                className={NUMBER_CLASS}
              />
            </div>
          </div>
        )}

        <p className="text-center text-sm text-text-muted" aria-live="polite">
          {inScope.length > 0
            ? t("exam.inScope").replace("{n}", num(inScope.length))
            : t("exam.emptyScope")}
        </p>
        <p className="text-center text-xs text-text-muted">{t("exam.noPeekNote")}</p>

        <div className="text-center">
          <Button onClick={begin} size="lg" disabled={inScope.length === 0}>
            {t("exam.start")}
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === "exam") {
    const meta = currentKey ? verseMeta(currentKey) : { surahLabel: "", refLabel: "" };
    return (
      <Card role="region" aria-label={t("exam.title")} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-heading font-semibold">
            {meta.surahLabel}{" "}
            <span className="font-mono text-xs text-text-muted">{meta.refLabel}</span>
          </span>
          <span className="font-mono text-xs text-text-muted tabular-nums" aria-live="off">
            {formatElapsed(elapsed)}
          </span>
        </div>

        <ProgressBar value={verseIdx + 1} max={examVerses.length} showLabel />
        <p className="text-center text-sm font-heading font-semibold">
          {t("exam.progress")
            .replace("{n}", num(verseIdx + 1))
            .replace("{total}", num(examVerses.length))}
        </p>

        {mark === null ? (
          <>
            {/* No-peek: the verse text is NOT rendered until the learner commits a
                self-mark; only the reference above is shown. */}
            <p className="text-center text-sm text-text-muted">{t("exam.noPeekNote")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => doMark(true)}
                size="lg"
                className="bg-gold text-ink hover:bg-gold-deep"
              >
                {t("exam.markRecalled")}
              </Button>
              <Button
                variant="primary"
                onClick={() => doMark(false)}
                size="lg"
                className="bg-accent text-white hover:bg-accent/90 dark:bg-accent dark:text-white dark:hover:bg-accent/90"
              >
                {t("exam.markMissed")}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {!revealed ? (
              <Button variant="outline" onClick={reveal} size="lg" className="w-full">
                {t("exam.reveal")}
              </Button>
            ) : (
              <div className={VERSE_BOX}>
                {revealHtml === null ? (
                  <TajweedText tajweedHtml="" loading className="block" />
                ) : revealHtml === "" ? (
                  <p className="text-sm text-text-muted">{t("reading.unavailable")}</p>
                ) : (
                  <TajweedText tajweedHtml={revealHtml} size="lg" className="block" />
                )}
              </div>
            )}
            <Button onClick={advance} size="lg" className="w-full">
              {t("common.next")}
            </Button>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={restart} className="w-full">
          {t("exam.restart")}
        </Button>
      </Card>
    );
  }

  // Summary phase.
  const percent = attempted > 0 ? Math.round((recalled / attempted) * 100) : 0;
  const recent = (progress.examLog ?? []).slice(0, 8);
  return (
    <Card role="region" aria-label={t("exam.title")} className="space-y-4">
      <div className="space-y-1 text-center">
        <div className="text-h2 font-bold text-primary dark:text-primary-light tabular-nums">
          {t("exam.score").replace("{percent}", num(percent))}
        </div>
        <p className="text-sm text-text-muted">
          {t("exam.scoreDetail")
            .replace("{recalled}", num(recalled))
            .replace("{total}", num(attempted))}
        </p>
        <p className="text-sm text-text-muted tabular-nums">
          {t("exam.elapsed").replace("{time}", formatElapsed(elapsed))}
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-heading text-sm font-semibold">{t("exam.recentTitle")}</h4>
        {recent.length === 0 ? (
          <p className="text-sm text-text-muted">{t("exam.recentEmpty")}</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((a, i) => (
              <li
                key={`${a.dateIso}-${i}`}
                className="flex items-center justify-between gap-2 border-b border-gold-light/30 py-1 text-xs last:border-0 dark:border-gold-dark/20"
              >
                <span className="min-w-0 flex-1 truncate">{a.scope}</span>
                <span className="shrink-0 font-medium tabular-nums">{num(a.percent)}%</span>
                <span className="shrink-0 text-text-muted tabular-nums">
                  {isAr ? toArabicIndic(a.dateIso) : a.dateIso}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-center">
        <Button onClick={restart} size="lg">
          {t("exam.restart")}
        </Button>
      </div>
    </Card>
  );
}
