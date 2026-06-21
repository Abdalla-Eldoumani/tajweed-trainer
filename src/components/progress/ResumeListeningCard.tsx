"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSettings } from "@/hooks/useSettings";
import { usePlayer } from "@/hooks/usePlayer";
import { useTranslation } from "@/lib/i18n";
import { getPlayerResume } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";
import { getBundledChaptersIndex } from "@/lib/quran-api";
import { toArabicIndic } from "@/lib/utils";
import type { PlayerResume } from "@/lib/types";

// Surah headers from the bundled index (READ ONLY) so the stored verse can show
// its surah name without a network round-trip; never edits or generates.
const SURAH_BY_NUMBER = new Map(getBundledChaptersIndex().map((s) => [s.number, s]));

// A /progress card that restarts playback at the last verse the user PLAYED. This
// is the listening counterpart to resume-reading (the last page READ, a separate
// field): playerResume already records {surah, ayah, mode, offset, reciter} on
// pause/stop/tab-hide, so the only gap is a surface that shows it and restarts it.
// It routes through the ONE engine (usePlayer.playVerse) — no second <audio>, no
// parallel store, and it adds no storage field (PATTERNS landmine C). Mounted-
// gated so the store-derived card never flashes before hydration; hidden entirely
// when there is no resume record.
export function ResumeListeningCard() {
  const { t, isAr } = useTranslation();
  const { settings } = useSettings();

  const [mounted, setMounted] = useState(false);
  const [resume, setResume] = useState<PlayerResume | null>(null);

  useEffect(() => {
    setMounted(true);
    setResume(getPlayerResume());
    // Stay in sync with playback in the same tab (e.g. a recall session) so the
    // card reflects the latest played verse without a reload.
    return subscribeProgressChanged(() => setResume(getPlayerResume()));
  }, []);

  // Before mount, and when nothing has been played, render no card at all.
  if (!mounted || !resume) return null;

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
    <section aria-labelledby="resume-listening-heading">
      <SectionHeading as="h2" className="mb-4">
        <span id="resume-listening-heading">{t("resume.listenTitle")}</span>
      </SectionHeading>
      <Card>
        <p className="text-sm text-text-muted mb-3">{t("resume.listenSubtitle")}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-heading font-semibold">
            {surahName}{" "}
            <span className="font-mono text-xs text-text-muted">{refLabel}</span>
          </span>
          <Button variant="primary" size="sm" onClick={handleResume} aria-label={ariaLabel}>
            {t("resume.listenButton")}
          </Button>
        </div>
      </Card>
    </section>
  );
}
