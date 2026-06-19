"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { getTranslationsForChapter, getTafsirForVerse } from "@/lib/quran-api";

type Load = "idle" | "loading" | "error" | "ready";

interface ReadingDepthProps {
  surah: number;
  ayah: number;
}

// Translation, and on-demand tafsir, for one verse. Every field is fetched from
// the authenticated Quran.com API; nothing is generated here, and the tafsir
// HTML is sanitized inside the API wrapper before it arrives. Loading, error,
// and empty are all handled; the panel shows nothing it does not have.
export function ReadingDepth({ surah, ayah }: ReadingDepthProps) {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const verseKey = `${surah}:${ayah}`;

  const [translation, setTranslation] = useState<string | null>(null);
  const [translationState, setTranslationState] = useState<Load>("idle");
  const [tafsir, setTafsir] = useState<string | null>(null);
  const [tafsirState, setTafsirState] = useState<Load>("idle");
  const [tafsirOpen, setTafsirOpen] = useState(false);

  useEffect(() => {
    if (!settings.showTranslation) {
      setTranslationState("idle");
      return;
    }
    let alive = true;
    setTranslationState("loading");
    getTranslationsForChapter(surah, settings.translationId ?? 20)
      .then((map) => {
        if (!alive) return;
        setTranslation(map[verseKey] ?? null);
        setTranslationState("ready");
      })
      .catch(() => {
        if (alive) setTranslationState("error");
      });
    return () => {
      alive = false;
    };
  }, [surah, verseKey, settings.showTranslation, settings.translationId]);

  function toggleTafsir() {
    setTafsirOpen((open) => !open);
    if (tafsir !== null || tafsirState === "loading") return;
    setTafsirState("loading");
    getTafsirForVerse(verseKey, settings.tafsirId ?? 169)
      .then((html) => {
        setTafsir(html);
        setTafsirState("ready");
      })
      .catch(() => setTafsirState("error"));
  }

  return (
    <div className="mt-2 space-y-2 text-sm">
      {settings.showTranslation && translationState === "loading" && (
        <div className="space-y-2 animate-pulse motion-reduce:animate-none" aria-hidden="true">
          <div className="h-4 w-full bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
          <div className="h-4 w-4/5 bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
        </div>
      )}
      {settings.showTranslation && translationState === "error" && (
        <p className="text-text-muted">{t("reading.unavailable")}</p>
      )}
      {settings.showTranslation && translationState === "ready" && translation && (
        // Already sanitized by getTranslationsForChapter; rendered as HTML so the
        // source's own footnote markers (e.g. <sup>) show as superscripts rather
        // than literal text. Never generated content.
        <p
          className="text-text leading-relaxed"
          dir="auto"
          dangerouslySetInnerHTML={{ __html: translation }}
        />
      )}

      <button
        type="button"
        onClick={toggleTafsir}
        aria-expanded={tafsirOpen}
        className="text-xs text-primary dark:text-primary-light hover:underline underline-offset-2"
      >
        {tafsirOpen ? t("reading.hideTafsir") : t("reading.showTafsir")}
      </button>

      {tafsirOpen && (
        <div
          className="rounded-lg border border-gold-light/30 dark:border-gold-dark/20 p-3 max-h-72 overflow-y-auto"
          dir="auto"
        >
          {tafsirState === "loading" && (
            <div className="space-y-2 animate-pulse motion-reduce:animate-none" aria-hidden="true">
              <div className="h-4 w-full bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
              <div className="h-4 w-full bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
              <div className="h-4 w-2/3 bg-bg-subtle dark:bg-bg-subtle-dark rounded" />
            </div>
          )}
          {tafsirState === "error" && <p className="text-text-muted">{t("reading.unavailable")}</p>}
          {/* Already sanitized by getTafsirForVerse; never generated text. */}
          {tafsirState === "ready" && tafsir && (
            <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: tafsir }} />
          )}
          {tafsirState === "ready" && !tafsir && <p className="text-text-muted">{t("reading.noTafsir")}</p>}
        </div>
      )}
    </div>
  );
}
