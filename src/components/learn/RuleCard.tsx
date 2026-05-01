"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { QuranFrame } from "@/components/ui/QuranFrame";
import { ExampleCard } from "./ExampleCard";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { QuranicExample, ArabicLetter } from "@/lib/types";

interface RuleCardProps {
  titleEn: string;
  titleAr: string;
  description: string;
  descriptionAr?: string;
  letters?: ArabicLetter[];
  examples?: QuranicExample[];
  commonMistakes?: string[];
  commonMistakesAr?: string[];
  color?: string;
  mnemonicAr?: string;
  mnemonicEn?: string;
  defaultExpanded?: boolean;
}

export function RuleCard({
  titleEn,
  titleAr,
  description,
  descriptionAr,
  letters,
  examples,
  commonMistakes,
  commonMistakesAr,
  color,
  mnemonicAr,
  mnemonicEn,
  defaultExpanded = false,
}: RuleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { t, isAr } = useTranslation();

  const primaryTitle = isAr ? titleAr : titleEn;
  const secondaryTitle = isAr ? titleEn : titleAr;
  const desc = isAr && descriptionAr ? descriptionAr : description;
  const mistakes = isAr && commonMistakesAr ? commonMistakesAr : commonMistakes;

  return (
    <Card variant="ornate" className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-start flex items-start gap-3 min-h-[44px]"
        aria-expanded={expanded}
      >
        {color && (
          <span
            className="w-1.5 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-heading font-semibold text-sm">{primaryTitle}</h3>
              {isAr ? (
                <p className="text-xs text-text-muted mt-0.5">{secondaryTitle}</p>
              ) : (
                <ArabicText text={secondaryTitle} size="sm" className="text-text-muted mt-0.5" />
              )}
            </div>
            <svg
              className={cn("w-5 h-5 text-text-muted transition-transform shrink-0", expanded && "rotate-180")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <p className="text-xs text-text-muted mt-2">{desc}</p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 pt-4">
          <div className="gold-divider" />

          {letters && letters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted mb-2">{t("module.letters")}</h4>
              <div className="flex flex-wrap gap-2">
                {letters.map((letter) => (
                  <div
                    key={letter.arabic + (letter.name_en ?? "")}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card dark:bg-bg-card-dark border border-gold-light/20 dark:border-gold-dark/20"
                  >
                    <ArabicText text={letter.arabic} size="sm" />
                    <span className="text-xs text-text-muted">{isAr ? (letter.name_ar ?? letter.name_en) : letter.name_en}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mnemonicAr && (
            <div className="p-3 rounded-lg bg-gold-light/10 dark:bg-gold-dark/10 border border-gold-light/20 dark:border-gold-dark/20">
              <p className="text-xs font-semibold text-text-muted mb-1">{t("module.mnemonic")}</p>
              <ArabicText text={mnemonicAr} size="sm" />
              {mnemonicEn && !isAr && <p className="text-xs text-text-muted mt-1">{mnemonicEn}</p>}
            </div>
          )}

          {examples && examples.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted mb-2">{t("module.quranicExamples")}</h4>
              <div className="grid gap-3">
                {examples.map((ex, i) => (
                  <ExampleCard key={i} example={ex} color={color} />
                ))}
              </div>
            </div>
          )}

          {mistakes && mistakes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">{t("module.commonMistakes")}</h4>
              <ul className="space-y-1">
                {mistakes.map((mistake, i) => (
                  <li key={i} className="text-xs text-text-muted flex gap-2">
                    <svg className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {mistake}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
