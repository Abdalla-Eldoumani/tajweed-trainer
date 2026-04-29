"use client";

import { memo } from "react";
import { ArabicText } from "@/components/ui/ArabicText";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { Badge } from "@/components/ui/Badge";
import { QuranFrame } from "@/components/ui/QuranFrame";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { formatSurahReference } from "@/lib/utils";
import type { QuranicExample } from "@/lib/types";

interface ExampleCardProps {
  example: QuranicExample;
  color?: string;
}

export const ExampleCard = memo(function ExampleCard({ example, color }: ExampleCardProps) {
  const { settings } = useSettings();
  const { isAr, lang } = useTranslation();

  const translation = isAr && example.translation_ar ? example.translation_ar : example.translation;
  const ruleApplied = isAr && example.rule_applied_ar ? example.rule_applied_ar : example.rule_applied;

  return (
    <QuranFrame size="sm">
      <div className="space-y-3">
        <div className="text-center overflow-x-auto">
          <ArabicText text={example.arabic} quran size="lg" />
        </div>

        {settings.showTransliteration && !isAr && (
          <p className="text-center text-sm font-mono text-text-muted">
            {example.transliteration}
          </p>
        )}

        {settings.showTranslation && (
          <p className="text-center text-sm text-text-muted italic">
            &ldquo;{translation}&rdquo;
          </p>
        )}

        <div className="gold-divider" />

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {formatSurahReference(
              { en: example.surah_name_en, ar: example.surah_name_ar },
              example.surah,
              example.ayah,
              lang,
            )}
          </span>
          <AudioPlayer surah={example.surah} ayah={example.ayah} compact />
        </div>

        <Badge color={color}>{ruleApplied}</Badge>
      </div>
    </QuranFrame>
  );
});

ExampleCard.displayName = "ExampleCard";
