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
import { fetchSegments, type WordSegment } from "@/lib/audio-api";
import { resolveRevisionReciter } from "@/lib/revision-reciter";
import { canAlign, rangeBounds } from "@/lib/follow-along";
import { sanitizeTajweedHtml } from "@/lib/sanitize";
import {
  splitIntoChunks,
  DEFAULT_CHUNK_SIZE,
  CHUNK_SIZE_PRESETS,
  type WordChunk,
} from "@/lib/verse-segments";
import { toArabicIndic, cn } from "@/lib/utils";
import type { RecallGrade, VerseWord } from "@/lib/types";

// Surah headers from the bundled index (READ ONLY) so a verse can show its surah
// name without a network round-trip; never edits or generates.
const SURAHS = getBundledChaptersIndex();
const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

// The manuscript-token bordered box every reveal renders inside, matching the
// other two drills' verse frames.
const VERSE_BOX =
  "rounded-xl border border-gold-light/30 bg-bg-subtle/30 p-4 text-center dark:border-gold-dark/20 dark:bg-bg-subtle-dark/30";

const SELECT_CLASS =
  "w-full text-small bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]";

// Sort verseKeys ("s:a") numerically by surah then ayah, so the picker reads in
// mushaf order rather than string order (which mis-sorts 10 before 2).
function compareVerseKeys(a: string, b: string): number {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
}

// A CONSERVATIVE visual-word count of the tajweed HTML: drop the trailing
// ayah-number <span class="end">…</span>, strip the remaining tags, and split the
// text on whitespace. This is NOT byte-identical to TajweedFollowText's DOM
// grouping (which merges adjacent letter-span siblings into one word); this
// tag-strip over-counts when letter spans are whitespace-separated, so it is
// always >= the renderer's group count. That direction is deliberate: it is used
// ONLY to PREFER the safe tier — equal to the real-word count => try Tier 1
// (colored window reveal); any mismatch => Tier 2 plain verified-word fallback.
// If this ever picked Tier 1 while the renderer's own grouping disagreed,
// TajweedFollowText fails safe (revealRange + canAlign-fail blurs EVERY word, so
// the answer is never shown), so the tier choice can never leak the hidden head.
// READ-ONLY over the SAME sanitized markup — no edit, no recolor.
function visualWordCount(tajweedHtml: string): number {
  const safe = sanitizeTajweedHtml(tajweedHtml);
  const withoutEnd = safe.replace(/<span class="end">[\s\S]*?<\/span>/g, " ");
  const text = withoutEnd.replace(/<[^>]+>/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// The chunk / prefix / whole-verse reveal frame. Tier 1 renders the FULL verse
// tajweed through TajweedFollowText with a revealRange window (blurring every word
// outside [start..end]) so color is preserved and the markup is never edited. Tier
// 2 (canAlign mismatch — TajweedFollowText would render plain unmarked, i.e. the
// whole verse with nothing isolated) falls back to the verified word text of the
// revealed window joined plainly via ArabicText, so the chunk is ALWAYS drillable.
function ChunkReveal({
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
// realWords / realWordCount are the 06-02 end-marker-filtered word list; chunks is
// the pure split; tier decides the reveal path; segments/aligned decide per-chunk
// audio. Mid-session memorization changes never re-seed this (mirrors the other
// drills' snapshot-once invariant).
interface DrillSession {
  verseKey: string;
  surah: number;
  ayah: number;
  surahLabel: string;
  refLabel: string;
  realWords: VerseWord[];
  realWordCount: number;
  tajweedHtml: string;
  chunks: WordChunk[];
  tier: 1 | 2;
  segments: WordSegment[] | null;
  aligned: boolean;
}

type Phase = "picker" | "loading" | "error" | "drill" | "chain" | "grade";

// The segment drill: pick a memorized verse, split it into word-boundary chunks
// (06-01), drill each chunk in isolation via a window reveal over the verse's
// tajweed HTML (SEG-01), chain the chunks with a growing-prefix cue (SEG-02), and
// optionally record ONE whole-verse SM-2 grade at the end. It mirrors
// ChainingDrill's session mechanics verbatim — the mounted gate, the
// revealRef→continueRef focus loop, and the root-scoped keys-1-4 grade listener —
// so with three keyboard drills on /progress a keypress grades only the focused
// one. Distinct segment.* labels + role="region" keep its locators unambiguous.
// A one-word / short verse shows a "no split" message and presents the verse whole
// (SEG-03); per-chunk audio uses rangeBounds + setSubVerseLoop only when the
// segments align, else it degrades to whole-verse playVerse — bounds are never
// fabricated. No storage-schema change: the one optional grade writes through the
// existing memorizationReviews keyspace.
export function SegmentDrill() {
  const { t, isAr } = useTranslation();
  const { memorized, mounted } = useMemorization();
  const { recordReview, preview } = useMemorizationReviews();
  const { settings } = useSettings();

  const [selectedKey, setSelectedKey] = useState("");
  const [chunkSize, setChunkSize] = useState<number>(DEFAULT_CHUNK_SIZE);
  const [phase, setPhase] = useState<Phase>("picker");
  const [session, setSession] = useState<DrillSession | null>(null);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const continueRef = useRef<HTMLButtonElement | null>(null);
  const revealRef = useRef<HTMLButtonElement | null>(null);
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
  // unmemorized between renders.
  const memorizedList = useMemo(
    () => Array.from(memorized).sort(compareVerseKeys),
    [memorized],
  );
  const effectiveKey = memorizedList.includes(selectedKey)
    ? selectedKey
    : memorizedList[0] ?? "";

  // The revision reciter (PROG-02): resolveRevisionReciter picks
  // settings.revisionReciter when set, else the browse settings.reciter. It feeds
  // BOTH fetchSegments (so the word-level timings come from the reciter that will
  // actually play) and playChunk's opts.reciter, so the segment drill can never
  // diverge from the other revision surfaces; the browse reader keeps settings.reciter.
  const revisionReciter = resolveRevisionReciter(settings);

  // Return to the pre-start picker; invalidates any in-flight load so a late
  // resolve cannot revive a stale session.
  const reset = useCallback(() => {
    loadSeq.current += 1;
    setPhase("picker");
    setSession(null);
    setChunkIndex(0);
    setRevealed(false);
  }, []);

  // Resolve the chosen verse's REAL word list (06-02 filtered), its tajweed HTML
  // (snapshot-first, else the cached surah fetch), and its audio segments, then
  // snapshot the split. A single-chunk verse (SEG-03) skips straight to the
  // optional grade, presenting the verse whole with the no-split note.
  const start = useCallback(async () => {
    const key = effectiveKey;
    if (!key) return;
    const seq = ++loadSeq.current;
    const [surah, ayah] = key.split(":").map(Number);
    setSession(null);
    setChunkIndex(0);
    setRevealed(false);
    setPhase("loading");
    try {
      const snapshot = getVerseSnapshotByKey(key);
      const [wordsByKey, tajweedHtml, segments] = await Promise.all([
        getWordsForChapter(surah),
        snapshot
          ? Promise.resolve(snapshot.tajweedHtml)
          : getTajweedSurah(surah).then(
              (verses) => verses.find((v) => v.verseKey === key)?.tajweedHtml ?? null,
            ),
        fetchSegments(surah, ayah, revisionReciter),
      ]);
      if (seq !== loadSeq.current) return;
      const realWords = wordsByKey[key] ?? [];
      const realWordCount = realWords.length;
      if (!tajweedHtml || realWordCount === 0) {
        setPhase("error");
        return;
      }
      const chunks = splitIntoChunks(realWordCount, chunkSize);
      // Tier 1 when the whitespace-derived visual-word count matches the real-word
      // count (TajweedFollowText's own canAlign will then engage); else Tier 2.
      const tier: 1 | 2 = canAlign(realWordCount, visualWordCount(tajweedHtml)) ? 1 : 2;
      // Audio aligns only when the reciter emitted exactly one segment per real
      // word; otherwise per-chunk playback degrades to the whole verse.
      const aligned = !!segments && canAlign(segments.length, realWordCount);
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
        chunks,
        tier,
        segments,
        aligned,
      });
      setPhase(chunks.length > 1 ? "drill" : "grade");
    } catch {
      if (seq === loadSeq.current) setPhase("error");
    }
  }, [effectiveKey, chunkSize, revisionReciter, verseMeta]);

  // Per-chunk audio: play the verse (loading it as the queue head — Pitfall 6) and,
  // when the segments align, loop just the chunk's [startMs..endMs] once via the
  // ONE player engine. When null/misaligned there are no bounds, so this is a plain
  // whole-verse play (SEG-03 degrade) — bounds are never fabricated. No second
  // <audio> element.
  const playChunk = useCallback(
    (startWordIdx: number, endWordIdx: number) => {
      if (!session) return;
      const bounds =
        session.aligned && session.segments
          ? rangeBounds(session.segments, startWordIdx, endWordIdx)
          : null;
      usePlayer.getState().playVerse(session.surah, session.ayah, {
        reciter: revisionReciter,
        speed: settings.playbackSpeed,
        surahName: session.surahLabel || null,
      });
      if (bounds) usePlayer.getState().setSubVerseLoop(bounds.startMs, bounds.endMs, 1);
    },
    [session, revisionReciter, settings.playbackSpeed],
  );

  // The single optional whole-verse grade (Phase C). Records ONCE through the
  // shared memorizationReviews SM-2 keyspace, then returns to the picker. Never per
  // chunk, no schema change.
  const submitGrade = useCallback(
    (g: RecallGrade) => {
      if (!session) return;
      recordReview(session.verseKey, g);
      reset();
    },
    [session, recordReview, reset],
  );

  // Advance through Phase A (each chunk in isolation) then into Phase B chaining.
  const advanceDrill = useCallback(() => {
    if (!session) return;
    if (chunkIndex < session.chunks.length - 1) {
      setChunkIndex(chunkIndex + 1);
      return;
    }
    // Every chunk drilled → chain them (a single-chunk verse never reaches Phase A).
    setChunkIndex(0);
    setRevealed(false);
    setPhase("chain");
  }, [session, chunkIndex]);

  // Advance through Phase B (chain step k → k+1) then into the optional grade.
  const advanceChain = useCallback(() => {
    if (!session) return;
    if (chunkIndex < session.chunks.length - 2) {
      setChunkIndex(chunkIndex + 1);
      setRevealed(false);
      return;
    }
    setPhase("grade");
  }, [session, chunkIndex]);

  // Keep the keyboard loop closed across the session, exactly like the other two
  // drills: focus lands on Reveal while a chaining chunk is hidden and on the
  // primary advance/grade button otherwise, so an advance (which unmounts the
  // focused button) never drops focus to <body>. Skipped on the states that own
  // their own controls (picker / loading / error).
  useEffect(() => {
    if (phase === "picker" || phase === "loading" || phase === "error") return;
    if (phase === "chain" && !revealed) revealRef.current?.focus();
    else continueRef.current?.focus();
  }, [phase, revealed, chunkIndex]);

  // Keys 1-4 grade the whole verse (again/hard/good/easy), matching the button
  // order — LIVE ONLY at Phase C (grade), the smallest possible cross-fire surface.
  // Scoped to the focused drill: /progress shows three keyboard drills at once, so
  // without the rootRef.contains(activeElement) guard one keypress would grade more
  // than one and corrupt the shared SM-2 schedule (copied verbatim from
  // ChainingDrill). The reveal focus-loop keeps focus inside this card.
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
          <h3 className="font-heading text-lg font-semibold">{t("segment.title")}</h3>
          <p className="text-sm text-text-muted">{t("segment.description")}</p>
        </div>
        {memorizedList.length === 0 ? (
          <p className="text-center text-sm text-text-muted">{t("segment.empty")}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="segment-verse" className="block text-sm font-medium">
                {t("segment.pickVerse")}
              </label>
              <select
                id="segment-verse"
                value={effectiveKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                aria-label={t("segment.pickVerse")}
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
              <span className="block text-sm font-medium">{t("segment.chunkSize")}</span>
              <div role="group" aria-label={t("segment.chunkSize")} className="flex flex-wrap gap-2">
                {CHUNK_SIZE_PRESETS.map((size) => (
                  <Button
                    key={size}
                    variant={chunkSize === size ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setChunkSize(size)}
                    aria-pressed={chunkSize === size}
                    className="tabular-nums"
                  >
                    {num(size)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="text-center">
              <Button onClick={start} size="lg">
                {t("segment.startDrill")}
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

  const chunks = session.chunks;
  const current = chunks[chunkIndex];

  // The effective next interval each rating would schedule for the whole verse,
  // shown under each grade button (only rendered at Phase C).
  const intervals = preview(session.verseKey);
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
    <Card ref={rootRef} role="region" aria-label={t("segment.title")} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-heading font-semibold">
          {session.surahLabel} <span className="font-mono text-xs text-text-muted">{session.refLabel}</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            phase === "grade"
              ? playChunk(0, session.realWordCount - 1)
              : playChunk(current.startWordIdx, current.endWordIdx)
          }
          aria-label={t("player.playVerse")}
        >
          {t("player.playVerse")}
        </Button>
      </div>

      {phase === "drill" && (
        <>
          <ProgressBar value={chunkIndex + 1} max={chunks.length} showLabel />
          <p className="text-center text-sm font-heading font-semibold">{t("segment.drillProgress")}</p>
          <ChunkReveal session={session} range={{ start: current.startWordIdx, end: current.endWordIdx }} />
          <Button ref={continueRef} onClick={advanceDrill} size="lg" className="w-full">
            {chunkIndex < chunks.length - 1 ? t("segment.nextChunk") : t("segment.beginChain")}
          </Button>
        </>
      )}

      {phase === "chain" && (
        <>
          <ProgressBar value={chunkIndex + 1} max={Math.max(1, chunks.length - 1)} showLabel />
          <p className="text-center text-sm font-heading font-semibold">{t("segment.chainProgress")}</p>
          {/* Growing-prefix cue: reveal chunks 0..k, then extend through k+1. */}
          <ChunkReveal
            session={session}
            range={{
              start: 0,
              end: (revealed ? chunks[chunkIndex + 1] : chunks[chunkIndex]).endWordIdx,
            }}
          />
          {!revealed ? (
            <Button ref={revealRef} onClick={() => setRevealed(true)} size="lg" className="w-full">
              {t("segment.reveal")}
            </Button>
          ) : (
            <Button ref={continueRef} onClick={advanceChain} size="lg" className="w-full">
              {chunkIndex < chunks.length - 2 ? t("segment.nextChunk") : t("segment.finish")}
            </Button>
          )}
        </>
      )}

      {phase === "grade" && (
        <>
          {chunks.length === 1 && (
            <p className="text-center text-sm text-text-muted">{t("segment.noSplit")}</p>
          )}
          <ChunkReveal session={session} range={{ start: 0, end: session.realWordCount - 1 }} />
          <p className="text-center text-sm font-heading font-semibold">{t("segment.gradePrompt")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {gradeButtons.map(({ grade: g, labelKey, variant, className, ref }) => {
              const label = t(labelKey);
              const intervalText = t("memorize.gradeIntervalDays").replace("{n}", num(intervals[g]));
              return (
                <Button
                  key={g}
                  ref={ref}
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
            {t("segment.skipGrade")}
          </Button>
        </>
      )}
    </Card>
  );
}
