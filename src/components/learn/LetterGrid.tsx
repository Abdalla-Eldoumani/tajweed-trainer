"use client";

import { useState } from "react";
import { LetterCard } from "./LetterCard";
import { useTranslation } from "@/lib/i18n";

interface LetterInfo {
  arabic: string;
  name_en: string;
  name_ar?: string;
  condition?: string;
  note?: string;
}

interface LetterGroup {
  title: string;
  letters: LetterInfo[];
}

interface LetterGridProps {
  groups: LetterGroup[];
}

export function LetterGrid({ groups }: LetterGridProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const { isAr } = useTranslation();

  const selectedLetter = groups
    .flatMap((g) => g.letters)
    .find((l) => l.arabic === selected);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="text-micro font-semibold text-text-muted mb-2">{group.title}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {group.letters.map((letter) => (
              <LetterCard
                key={letter.arabic + letter.name_en}
                arabic={letter.arabic}
                nameEn={letter.name_en}
                nameAr={letter.name_ar}
                selected={selected === letter.arabic}
                onClick={() => setSelected(selected === letter.arabic ? null : letter.arabic)}
              />
            ))}
          </div>
        </div>
      ))}

      {selectedLetter && (
        <div className="p-4 rounded-lg bg-primary/5 dark:bg-primary-light/10 border border-primary/20">
          <p className="text-small font-medium">{isAr && selectedLetter.name_ar ? selectedLetter.name_ar : selectedLetter.name_en}</p>
          {selectedLetter.condition && (
            <p className="text-micro text-text-muted mt-1">{selectedLetter.condition}</p>
          )}
          {selectedLetter.note && (
            <p className="text-micro text-text-muted mt-1">{selectedLetter.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
