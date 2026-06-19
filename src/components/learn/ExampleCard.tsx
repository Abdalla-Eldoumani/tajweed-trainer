"use client";

import { memo } from "react";
import Link from "next/link";
import { ArabicText } from "@/components/ui/ArabicText";
import { TajweedText } from "@/components/ui/TajweedText";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { Badge } from "@/components/ui/Badge";
import { QuranFrame } from "@/components/ui/QuranFrame";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { formatSurahReference } from "@/lib/utils";
import { getVerseSnapshot } from "@/lib/verse-snapshots";
import { pageForSurah } from "@/lib/navigation";
import type { QuranicExample } from "@/lib/types";

interface ExampleCardProps {
  example: QuranicExample;
  color?: string;
}

export const ExampleCard = memo(function ExampleCard({ example, color }: ExampleCardProps) {
  const { settings } = useSettings();
  const { t, isAr, lang } = useTranslation();

  const translation = isAr && example.translation_ar ? example.translation_ar : example.translation;
  const ruleApplied = isAr && example.rule_applied_ar ? example.rule_applied_ar : example.rule_applied;

  // Real per-letter colors come from the authenticated API snapshot, rendered
  // exactly like the mushaf. With no snapshot, fall back to plain uthmani text
  // (never a hand-colored guess).
  const snapshot = getVerseSnapshot(example.surah, example.ayah);

  return (
    <QuranFrame size="sm">
      <div className="space-y-3">
        <div className="text-center overflow-x-auto">
          {snapshot?.tajweedHtml ? (
            <TajweedText tajweedHtml={snapshot.tajweedHtml} size="lg" explainRules />
          ) : (
            <ArabicText text={example.arabic} quran size="lg" />
          )}
        </div>

        {settings.showTransliteration && !isAr && (
          <p className="text-center text-small font-mono text-text-muted">
            {example.transliteration}
          </p>
        )}

        {settings.showTranslation && (
          <p className="text-center text-small text-text-muted italic">
            &ldquo;{translation}&rdquo;
          </p>
        )}

        <div className="gold-divider" />

        <div className="flex items-center justify-between">
          <span className="text-micro text-text-muted">
            {formatSurahReference(
              { en: example.surah_name_en, ar: example.surah_name_ar },
              example.surah,
              example.ayah,
              lang,
            )}
          </span>
          <AudioPlayer surah={example.surah} ayah={example.ayah} compact />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Badge color={color}>{ruleApplied}</Badge>
          <Link
            href={`/mushaf/page/${pageForSurah(example.surah)}?v=${example.surah}:${example.ayah}`}
            className="inline-flex items-center gap-1 text-micro text-primary dark:text-primary-light hover:underline shrink-0"
          >
            {t("lesson.openInReader")}
            <span aria-hidden="true">{isAr ? "←" : "→"}</span>
          </Link>
        </div>
      </div>
    </QuranFrame>
  );
});

ExampleCard.displayName = "ExampleCard";
