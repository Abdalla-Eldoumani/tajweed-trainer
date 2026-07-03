"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TajweedText } from "@/components/ui/TajweedText";
import { useMemorization } from "@/hooks/useMemorization";
import { useProgress } from "@/hooks/useProgress";
import { useSettings } from "@/hooks/useSettings";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";
import { getVerseSnapshotByKey } from "@/lib/verse-snapshots";
import { getTajweedSurah, getBundledChaptersIndex } from "@/lib/quran-api";
import { resolveRevisionReciter } from "@/lib/revision-reciter";
import { logTikrarReps } from "@/lib/storage";
import { toArabicIndic } from "@/lib/utils";

// Surah headers from the bundled index (READ ONLY) so a verse can show its surah
// name without a network round-trip; never edits or generates.
const SURAHS = getBundledChaptersIndex();
const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

// The verse picker select, on the same manuscript tokens as the other drills.
const SELECT_CLASS =
  "w-full text-small bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]";

// The bordered box the looped verse renders inside, matching the other drills'
// verse frames.
const VERSE_BOX =
  "rounded-xl border border-gold-light/30 bg-bg-subtle/30 p-4 text-center dark:border-gold-dark/20 dark:bg-bg-subtle-dark/30";

// The session target range, mirroring storage's tikrarTarget clamp [1,20]. The
// default (5) matches DEFAULT_SETTINGS, used when the setting is not yet present.
const MIN_TARGET = 1;
const MAX_TARGET = 20;
const DEFAULT_TARGET = 5;
const clampTarget = (n: number | undefined) =>
  Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(n ?? DEFAULT_TARGET) || DEFAULT_TARGET));

// Sort verseKeys ("s:a") numerically by surah then ayah so the picker reads in
// mushaf order rather than string order (which mis-sorts 10 before 2). Copied
// from the other pick-a-verse drills.
function compareVerseKeys(a: string, b: string): number {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
}

// The chosen verse for a rep session. No word list or tier machinery — tikrar is
// a rep counter, not a graded drill, so it only needs the verse's tajweed markup
// to display and its coordinates to arm the loop.
interface DrillSession {
  verseKey: string;
  surah: number;
  ayah: number;
  surahLabel: string;
  refLabel: string;
  tajweedHtml: string;
}

type Phase = "picker" | "loading" | "error" | "session";

// The tikrar (repetition) rep counter on /progress (EXAM-01). Pick a memorized
// verse, set a session target, loop it via the ONE audio engine, and count reps
// toward the target — each session's reps ADD to the verse's cumulative cross-day
// total through logTikrarReps, and the running total climbs live. It mirrors the
// other drills' pick-a-verse Card skeleton but has NO SM-2 grade, writes nothing to
// the recall schedule, and has NO document-level key handler: every action is a
// button, so a keypress can never cross-fire the other five drills' grade keys. A
// rep is counted on a manual
// tap AND on each completed listen observed from the store, so the counter works
// even with no audio file (offline / a reciter without one). Verse text renders
// only through TajweedText from the verified snapshot/API — never generated.
export function TikrarDrill() {
  const { t, isAr } = useTranslation();
  const { memorized, mounted } = useMemorization();
  // The running cross-day total lives on progress.tikrarLog; reading it through
  // useProgress means the total re-renders through the change bus after a finish.
  const { progress } = useProgress();
  const { settings } = useSettings();

  const [selectedKey, setSelectedKey] = useState("");
  const [phase, setPhase] = useState<Phase>("picker");
  const [session, setSession] = useState<DrillSession | null>(null);
  // The learner's own adjustment, or null to track the saved default. Derived (not
  // synced through an effect) so the stored tikrarTarget flows in after settings
  // mount without a setState-in-effect cascade, and a manual step wins from there.
  const [targetOverride, setTargetOverride] = useState<number | null>(null);
  const target = targetOverride ?? clampTarget(settings.tikrarTarget);
  const [done, setDone] = useState(0);

  // Guards a slow start() load from being applied after a newer start/reset.
  const loadSeq = useRef(0);
  // The last repeatsDone value we counted, so each completed listen is counted
  // exactly once (the store resets repeatsDone to 0 on each re-arm).
  const lastRepeatsRef = useRef(0);
  // The last repeatOneCompletions value counted, baselined on each arm so a
  // played-through loop adds exactly its terminal listen once.
  const lastCompletionsRef = useRef(0);
  // The uncommitted reps + their verseKey, mirrored so finish and the unmount
  // cleanup can log them once without losing a session left mid-way.
  const pendingRef = useRef<{ verseKey: string; reps: number }>({ verseKey: "", reps: 0 });

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // Observe completed listens from the ONE engine via a primitive selector (per
  // the usePlayer note on avoiding per-tick re-renders).
  const repeatsDone = usePlayer((s) => s.repeatsDone);
  // The terminal-listen signal from the same engine: repeatsDone counts loop-backs
  // and tops at target-1, so the final listen is counted from this monotonic
  // completion counter instead (the store bumps it once per loop that plays through).
  const repeatOneCompletions = usePlayer((s) => s.repeatOneCompletions);

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
  // unmemorized between renders (reconcile-in-render, like the other drills).
  const memorizedList = useMemo(() => Array.from(memorized).sort(compareVerseKeys), [memorized]);
  const effectiveKey = memorizedList.includes(selectedKey) ? selectedKey : memorizedList[0] ?? "";

  // Keep the finish/unmount commit target current with the live counter.
  useEffect(() => {
    pendingRef.current = { verseKey: session?.verseKey ?? "", reps: session ? done : 0 };
  }, [session, done]);

  // Count each newly completed listen once: add only the positive delta since the
  // value we last observed. Active only in the session phase, so a global playback
  // elsewhere never bumps the counter.
  //
  // repeatsDone counts loop-BACKS, so it tops out at target-1 (the last listen ends
  // by stopping, not by looping). The final listen is counted separately from the
  // store's repeatOneCompletions signal below, so the two together total the true N.
  useEffect(() => {
    if (phase !== "session") return;
    if (repeatsDone > lastRepeatsRef.current) {
      const delta = repeatsDone - lastRepeatsRef.current;
      lastRepeatsRef.current = repeatsDone;
      setDone((d) => d + delta);
    }
  }, [repeatsDone, phase]);

  // Count the terminal listen of each played-through loop — the one repeatsDone
  // can't see (the loop ends by stopping, resetting repeatsDone to 0 with no final
  // delta). The store bumps repeatOneCompletions once per loop that reaches its last
  // listen (see repeatOneJustCompleted); a no-audio session fires neither signal, so
  // the manual countRep tap stays the counter there with no over-count.
  useEffect(() => {
    if (phase !== "session") return;
    if (repeatOneCompletions > lastCompletionsRef.current) {
      const delta = repeatOneCompletions - lastCompletionsRef.current;
      lastCompletionsRef.current = repeatOneCompletions;
      setDone((d) => d + delta);
    }
  }, [repeatOneCompletions, phase]);

  // Log any uncommitted reps once. Idempotent: it zeroes the pending count after,
  // so a later finish/unmount call is a no-op (logTikrarReps also no-ops on 0).
  const commit = useCallback(() => {
    const pending = pendingRef.current;
    if (pending.reps > 0 && pending.verseKey) {
      logTikrarReps(pending.verseKey, pending.reps);
    }
    pendingRef.current = { verseKey: pending.verseKey, reps: 0 };
  }, []);

  // On unmount (e.g. navigating away mid-session) commit the in-progress reps and
  // disarm the loop so it does not keep running after the drill closes.
  useEffect(() => {
    return () => {
      commit();
      usePlayer.getState().setRepeatOne(0);
    };
  }, [commit]);

  // Return to the pre-start picker; invalidates any in-flight load so a late
  // resolve cannot revive a stale session.
  const reset = useCallback(() => {
    loadSeq.current += 1;
    setPhase("picker");
    setSession(null);
    setDone(0);
    lastRepeatsRef.current = 0;
    lastCompletionsRef.current = 0;
    pendingRef.current = { verseKey: "", reps: 0 };
  }, []);

  // The revision reciter (PROG-02): resolveRevisionReciter picks
  // settings.revisionReciter when set, else the browse settings.reciter. Passed as
  // opts.reciter so the tikrar loop matches the other revision surfaces; the
  // browse reader keeps settings.reciter.
  const revisionReciter = resolveRevisionReciter(settings);

  // Arm the loop on the ONE engine: playVerse loads the queue head, then
  // setRepeatOne(target) makes it repeat the ayah `target` times via the engine's
  // nextAfterEnded precedence. Order matters — playVerse resets repeatOne, so
  // setRepeatOne must follow it. No second audio element is ever created.
  const armLoop = useCallback(
    (s: DrillSession) => {
      usePlayer.getState().playVerse(s.surah, s.ayah, {
        reciter: revisionReciter,
        speed: settings.playbackSpeed,
        surahName: s.surahLabel || null,
      });
      usePlayer.getState().setRepeatOne(target);
      lastRepeatsRef.current = 0;
      lastCompletionsRef.current = usePlayer.getState().repeatOneCompletions;
    },
    [revisionReciter, settings.playbackSpeed, target],
  );

  // Resolve the chosen verse's tajweed HTML (snapshot-first, else the cached surah
  // fetch — exactly like the other drills), snapshot it, and arm the loop. Runs off
  // the Start button's user gesture, so playback autoplay is allowed.
  const start = useCallback(async () => {
    const key = effectiveKey;
    if (!key) return;
    const seq = ++loadSeq.current;
    const [surah, ayah] = key.split(":").map(Number);
    setSession(null);
    setDone(0);
    setPhase("loading");
    try {
      const snapshot = getVerseSnapshotByKey(key);
      const tajweedHtml = snapshot
        ? snapshot.tajweedHtml
        : (await getTajweedSurah(surah)).find((v) => v.verseKey === key)?.tajweedHtml ?? null;
      if (seq !== loadSeq.current) return;
      if (!tajweedHtml) {
        setPhase("error");
        return;
      }
      const meta = verseMeta(key);
      const next: DrillSession = {
        verseKey: key,
        surah,
        ayah,
        surahLabel: meta.surahLabel,
        refLabel: meta.refLabel,
        tajweedHtml,
      };
      setSession(next);
      setPhase("session");
      armLoop(next);
    } catch {
      if (seq === loadSeq.current) setPhase("error");
    }
  }, [effectiveKey, verseMeta, armLoop]);

  // Count a rep on a manual tap so the counter works even without an audio file.
  const countRep = useCallback(() => setDone((d) => d + 1), []);

  // Re-arm the loop from the top (also re-counts completed listens from 0).
  const replay = useCallback(() => {
    if (session) armLoop(session);
  }, [session, armLoop]);

  // Log the session's reps into the cumulative cross-day total, stop the loop, and
  // return to the picker.
  const finish = useCallback(() => {
    commit();
    usePlayer.getState().stop();
    reset();
  }, [commit, reset]);

  const adjustTarget = useCallback(
    (delta: number) => setTargetOverride(clampTarget(target + delta)),
    [target],
  );

  // Gate the whole surface on the memorization mounted flag so the server and
  // first client paint agree (the /progress page also gates on mount + count).
  if (!mounted) return null;

  if (phase === "picker") {
    return (
      <Card className="space-y-4">
        <div className="space-y-1 text-center">
          <h3 className="font-heading text-lg font-semibold">{t("tikrar.title")}</h3>
          <p className="text-sm text-text-muted">{t("tikrar.description")}</p>
        </div>
        {memorizedList.length === 0 ? (
          <p className="text-center text-sm text-text-muted">{t("tikrar.empty")}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="tikrar-verse" className="block text-sm font-medium">
                {t("tikrar.pickVerse")}
              </label>
              <select
                id="tikrar-verse"
                value={effectiveKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                aria-label={t("tikrar.pickVerse")}
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
            <div className="space-y-1">
              <span id="tikrar-target-label" className="block text-sm font-medium">
                {t("tikrar.target")}
              </span>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustTarget(-1)}
                  disabled={target <= MIN_TARGET}
                  aria-label={t("tikrar.decreaseTarget")}
                >
                  −
                </Button>
                <span
                  className="min-w-[3ch] text-center font-heading text-lg font-semibold tabular-nums"
                  aria-live="polite"
                  aria-labelledby="tikrar-target-label"
                >
                  {num(target)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustTarget(1)}
                  disabled={target >= MAX_TARGET}
                  aria-label={t("tikrar.increaseTarget")}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="text-center">
              <Button onClick={start} size="lg">
                {t("tikrar.startDrill")}
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

  // The cumulative cross-day total = the committed total for this verse plus this
  // session's uncommitted reps, so the learner sees it climb live.
  const committed = progress.tikrarLog?.[session.verseKey]?.reps ?? 0;
  const runningTotal = committed + done;

  return (
    <Card role="region" aria-label={t("tikrar.title")} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-heading font-semibold">
          {session.surahLabel}{" "}
          <span className="font-mono text-xs text-text-muted">{session.refLabel}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={replay} aria-label={t("player.playVerse")}>
          {t("player.playVerse")}
        </Button>
      </div>

      <div className={VERSE_BOX}>
        <TajweedText tajweedHtml={session.tajweedHtml} size="lg" className="block" />
      </div>

      <ProgressBar value={Math.min(done, target)} max={target} label={t("tikrar.title")} />

      <p className="text-center text-sm font-heading font-semibold">
        {t("tikrar.sessionProgress").replace("{done}", num(done)).replace("{target}", num(target))}
      </p>
      <p className="text-center text-xs text-text-muted">
        {t("tikrar.runningTotal").replace("{n}", num(runningTotal))}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={countRep} size="lg">
          {t("tikrar.countRep")}
        </Button>
        <Button variant="outline" size="lg" onClick={finish}>
          {t("tikrar.finish")}
        </Button>
      </div>
    </Card>
  );
}
