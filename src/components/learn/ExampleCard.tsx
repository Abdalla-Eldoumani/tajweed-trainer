"use client";

import { memo } from "react";
import { ArabicText } from "@/components/ui/ArabicText";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useSettings } from "@/hooks/useSettings";
import { formatSurahReference } from "@/lib/utils";
import type { QuranicExample } from "@/lib/types";

interface ExampleCardProps {
  example: QuranicExample;
  color?: string;
}

export const ExampleCard = memo(function ExampleCard({ example, color }: ExampleCardProps) {
  const { settings } = useSettings();

  return (
    <Card className="space-y-3">
      <div className="text-center overflow-x-auto">
        <ArabicText text={example.arabic} quran size="lg" />
      </div>

      {settings.showTransliteration && (
        <p className="text-center text-sm font-mono text-text-muted">
          {example.transliteration}
        </p>
      )}

      {settings.showTranslation && (
        <p className="text-center text-sm text-text-muted italic">
          &ldquo;{example.translation}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-text-muted">
          {formatSurahReference(example.surah_name_en, example.surah, example.ayah)}
        </span>
        <AudioPlayer surah={example.surah} ayah={example.ayah} compact />
      </div>

      <Badge color={color}>{example.rule_applied}</Badge>
    </Card>
  );
});

ExampleCard.displayName = "ExampleCard";
