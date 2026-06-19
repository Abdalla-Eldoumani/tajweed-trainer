"use client";

import { ArabicText } from "@/components/ui/ArabicText";
import { OrnamentalDivider } from "@/components/ui/Ornament";
import basmala from "@/data/basmala.json";

interface BismillahLineProps {
  surahNumber: number;
}

// Sourced from src/data/basmala.json (the verified Al-Fatihah 1:1 text, kept in
// lockstep with the snapshot by a verify check), never hardcoded in the
// component; the app renders Quran text, it does not author it. The tiny file
// avoids pulling the whole snapshot set into this route's bundle.
const BASMALA = basmala.text;

// The bismillah is part of ayah 1 of Al-Fatihah (Surah 1) and is omitted entirely
// from At-Tawbah (Surah 9). For every other surah we render it as a separate
// decorative line above the verse flow.
export function BismillahLine({ surahNumber }: BismillahLineProps) {
  if (surahNumber === 1 || surahNumber === 9 || !BASMALA) return null;

  return (
    <div className="my-3 text-center">
      <OrnamentalDivider className="max-w-md mx-auto mb-2" />
      <ArabicText
        text={BASMALA}
        quran
        size="lg"
        className="text-gold-dark dark:text-gold-light"
      />
      <OrnamentalDivider className="max-w-md mx-auto mt-2" />
    </div>
  );
}
