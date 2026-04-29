"use client";

import { ArabicText } from "@/components/ui/ArabicText";
import { OrnamentalDivider } from "@/components/ui/Ornament";

interface BismillahLineProps {
  surahNumber: number;
}

// The bismillah is part of ayah 1 of Al-Fatihah (Surah 1) and is omitted entirely
// from At-Tawbah (Surah 9). For every other surah we render it as a separate
// decorative line above the verse flow.
export function BismillahLine({ surahNumber }: BismillahLineProps) {
  if (surahNumber === 1 || surahNumber === 9) return null;

  return (
    <div className="my-3 text-center">
      <OrnamentalDivider className="max-w-md mx-auto mb-2" />
      <ArabicText
        text="بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
        quran
        size="lg"
        className="text-gold-dark dark:text-gold-light"
      />
      <OrnamentalDivider className="max-w-md mx-auto mt-2" />
    </div>
  );
}
