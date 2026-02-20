"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArabicText } from "@/components/ui/ArabicText";
import { ExampleCard } from "./ExampleCard";
import { cn } from "@/lib/utils";
import type { QuranicExample, ArabicLetter } from "@/lib/types";

interface RuleCardProps {
  titleEn: string;
  titleAr: string;
  description: string;
  letters?: ArabicLetter[];
  examples?: QuranicExample[];
  commonMistakes?: string[];
  color?: string;
  mnemonicAr?: string;
  mnemonicEn?: string;
  defaultExpanded?: boolean;
}

export function RuleCard({
  titleEn,
  titleAr,
  description,
  letters,
  examples,
  commonMistakes,
  color,
  mnemonicAr,
  mnemonicEn,
  defaultExpanded = false,
}: RuleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-3"
      >
        {color && (
          <span
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-heading font-semibold text-sm">{titleEn}</h3>
              <p className="font-arabic text-xs text-text-muted mt-0.5" dir="rtl" lang="ar">
                {titleAr}
              </p>
            </div>
            <svg
              className={cn("w-5 h-5 text-text-muted transition-transform shrink-0", expanded && "rotate-180")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <p className="text-xs text-text-muted mt-2">{description}</p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          {letters && letters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted mb-2">Letters</h4>
              <div className="flex flex-wrap gap-2">
                {letters.map((letter) => (
                  <div
                    key={letter.arabic + (letter.name_en ?? "")}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <ArabicText text={letter.arabic} size="sm" />
                    <span className="text-xs text-text-muted">{letter.name_en}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mnemonicAr && (
            <div className="p-3 rounded-lg bg-accent/10">
              <p className="text-xs font-semibold text-text-muted mb-1">Mnemonic</p>
              <ArabicText text={mnemonicAr} size="sm" />
              {mnemonicEn && <p className="text-xs text-text-muted mt-1">{mnemonicEn}</p>}
            </div>
          )}

          {examples && examples.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted mb-2">Quranic Examples</h4>
              <div className="grid gap-3">
                {examples.map((ex, i) => (
                  <ExampleCard key={i} example={ex} color={color} />
                ))}
              </div>
            </div>
          )}

          {commonMistakes && commonMistakes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Common Mistakes</h4>
              <ul className="space-y-1">
                {commonMistakes.map((mistake, i) => (
                  <li key={i} className="text-xs text-text-muted flex gap-2">
                    <span className="text-red-500 shrink-0">x</span>
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
