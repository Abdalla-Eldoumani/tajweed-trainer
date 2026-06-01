"use client";

import { useEffect, useRef, useState } from "react";
import { ArabicText } from "@/components/ui/ArabicText";
import { useTranslation } from "@/lib/i18n";
import { getWordsForChapter } from "@/lib/quran-api";
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
        {words.map((w) => {
          const playable = !!w.audioUrl;
          return (
            <button
              key={w.position}
              type="button"
              onClick={() => playWord(w.audioUrl)}
              disabled={!playable}
              aria-label={w.translation ?? w.transliteration ?? undefined}
              className={`flex flex-col items-center gap-0.5 rounded-lg border border-gold-light/30 dark:border-gold-dark/20 px-2 py-1.5 text-center ${
                playable ? "hover:bg-bg-subtle cursor-pointer" : "cursor-default"
              }`}
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
