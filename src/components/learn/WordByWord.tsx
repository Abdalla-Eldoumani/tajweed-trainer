"use client";

import { useEffect, useRef, useState } from "react";
import { ArabicText } from "@/components/ui/ArabicText";
import { useTranslation } from "@/lib/i18n";
import { getWordsForChapter } from "@/lib/quran-api";
import { fetchSegments, activeWordIndex, type WordSegment } from "@/lib/audio-api";
import { usePlayer } from "@/hooks/usePlayer";
import type { VerseWord } from "@/lib/types";

type Load = "loading" | "error" | "ready";

interface WordByWordProps {
  surah: number;
  ayah: number;
}

// Per-word breakdown for one verse: Uthmani text, transliteration, gloss, and the
// word's own audio clip. Every field comes from the authenticated Quran.com
// word-by-word endpoint (per chapter, cached); nothing is generated here. The
// word audio plays on its own element rather than the verse player, which is
// keyed on surah:ayah.
export function WordByWord({ surah, ayah }: WordByWordProps) {
  const { t } = useTranslation();
  const verseKey = `${surah}:${ayah}`;
  const [words, setWords] = useState<VerseWord[]>([]);
  const [state, setState] = useState<Load>("loading");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Word-sync highlight: when the global player is on THIS verse, the active
  // word lights up from the reciter's segment timestamps. Reciters without
  // segments (EveryAyah, a few Quran.com) simply never highlight.
  const isPlayingThisVerse = usePlayer((s) => {
    const c = s.queue[s.index];
    return !!c && c.surah === surah && c.ayah === ayah && s.status !== "idle";
  });
  const currentTime = usePlayer((s) => s.currentTime);
  const reciter = usePlayer((s) => s.reciter);
  const [segments, setSegments] = useState<WordSegment[] | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    getWordsForChapter(surah)
      .then((map) => {
        if (!alive) return;
        setWords(map[verseKey] ?? []);
        setState("ready");
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [surah, verseKey]);

  // Load segments only while this verse is the one playing, refetching when the
  // reciter changes. Cleared otherwise so a stale highlight never lingers.
  useEffect(() => {
    if (!isPlayingThisVerse) {
      setSegments(null);
      return;
    }
    let alive = true;
    fetchSegments(surah, ayah, reciter).then((segs) => {
      if (alive) setSegments(segs);
    });
    return () => {
      alive = false;
    };
  }, [isPlayingThisVerse, surah, ayah, reciter]);

  const activeIdx = isPlayingThisVerse && segments ? activeWordIndex(segments, currentTime * 1000) : -1;

  const playWord = (url: string | null) => {
    if (!url) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    }
    audio.src = url;
    audio.play().catch(() => {});
  };

  if (state === "loading") return <p className="text-text-muted text-sm">{t("common.loading")}</p>;
  if (state === "error") return <p className="text-text-muted text-sm">{t("reading.unavailable")}</p>;
  if (words.length === 0) return <p className="text-text-muted text-sm">{t("reading.noWords")}</p>;

  return (
    <div>
      <h4 className="text-xs font-semibold text-text-muted mb-2">{t("reading.wordByWord")}</h4>
      <div dir="rtl" className="flex flex-wrap gap-2">
        {words.map((w, i) => {
          const playable = !!w.audioUrl;
          const active = i === activeIdx;
          return (
            <button
              key={w.position}
              type="button"
              onClick={() => playWord(w.audioUrl)}
              disabled={!playable}
              aria-label={w.translation ?? w.transliteration ?? undefined}
              aria-current={active ? "true" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-center transition-colors motion-reduce:transition-none ${
                active
                  ? "border-primary bg-primary/15 dark:border-primary-light dark:bg-primary-light/20"
                  : "border-gold-light/30 dark:border-gold-dark/20"
              } ${playable ? "hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark cursor-pointer" : "cursor-default"}`}
            >
              <ArabicText text={w.textUthmani} quran size="sm" className="!leading-normal" />
              {w.transliteration && (
                <span className="text-[10px] font-mono text-text-muted" dir="ltr">{w.transliteration}</span>
              )}
              {w.translation && (
                <span className="text-[10px] text-text-muted" dir="ltr">{w.translation}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
