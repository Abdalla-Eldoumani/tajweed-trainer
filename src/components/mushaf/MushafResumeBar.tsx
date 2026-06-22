"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { getPlayerResume } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";
import { getBundledChaptersIndex } from "@/lib/quran-api";
import { toArabicIndic } from "@/lib/utils";
import type { PlayerResume } from "@/lib/types";

// Surah headers from the bundled index (READ ONLY) so the stored verse shows its
// surah name with no network round-trip; never edits or generates content.
const SURAH_BY_NUMBER = new Map(getBundledChaptersIndex().map((s) => [s.number, s]));

// An opt-in "listen to what you were listening to before" banner for the Mushaf
// reader. The player no longer auto-restores a saved position on load (which
// used to hijack a play on a different surah), so this is the explicit way to
// pick up the last verse the user played. It routes through the ONE engine
// (usePlayer.playVerse) and adds no storage field — it reads the same
// playerResume record the /progress ResumeListeningCard uses. Shown only when
// there is a resume record AND nothing is currently playing; hidden once
// dismissed for the session. Mounted-gated so it never flashes on hydration.
export function MushafResumeBar() {
  const { t, isAr } = useTranslation();
  const { settings } = useSettings();
  const status = usePlayer((s) => s.status);

  const [mounted, setMounted] = useState(false);
  const [resume, setResume] = useState<PlayerResume | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setResume(getPlayerResume());
    // Keep in sync with playback in this tab so the banner reflects the latest
    // played verse (e.g. after a recall session) without a reload.
    return subscribeProgressChanged(() => setResume(getPlayerResume()));
  }, []);

  // Nothing to resume, dismissed this session, or audio already going: no banner.
  if (!mounted || !resume || dismissed || status !== "idle") return null;

  const header = SURAH_BY_NUMBER.get(resume.surah);
  const surahName = header ? (isAr ? header.nameArabic : header.nameSimple) : "";
  const refLabel = isAr
    ? `${toArabicIndic(resume.surah)}:${toArabicIndic(resume.ayah)}`
    : `${resume.surah}:${resume.ayah}`;

  const handleResume = () => {
    usePlayer.getState().playVerse(resume.surah, resume.ayah, {
      reciter: resume.reciter,
      speed: settings.playbackSpeed,
      surahName: surahName || null,
    });
  };

  const ariaLabel = t("resume.listenAria")
    .replace("{surah}", surahName)
    .replace("{ref}", refLabel);

  return (
    <div className="mx-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold-light/40 dark:border-gold-dark/30 bg-bg-card dark:bg-bg-card-dark px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-primary dark:text-primary-light shrink-0" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="min-w-0 truncate text-small text-text dark:text-text-dark">
          {t("resume.listenSubtitle")}{" "}
          <span className="font-medium">{surahName}</span>{" "}
          <span className="font-mono text-micro text-text-muted tabular-nums">{refLabel}</span>
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleResume}
          aria-label={ariaLabel}
          className="inline-flex items-center min-h-[44px] px-3 rounded-lg bg-primary text-on-primary hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep text-small font-medium transition-colors"
        >
          {t("resume.listenButton")}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t("reading.close")}
          title={t("reading.close")}
          className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-muted hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
