"use client";

import { useEffect, useState } from "react";
import { useReadSections } from "@/hooks/useReadSections";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LessonProgressProps {
  moduleId: string;
  // The full ordered list of section slugs on this lesson page. Used to
  // compute the total denominator and to surface "next unread".
  sections: string[];
}

// Fixed progress chip rendered on lesson pages. Reads the readSections set
// for this module and shows "X / Y sections read". Tapping the chip jumps
// to the next unread section.
export function LessonProgress({ moduleId, sections }: LessonProgressProps) {
  const { t, lang } = useTranslation();
  const { readSet, mounted } = useReadSections(moduleId, sections);
  const [hidden, setHidden] = useState(false);

  // Hide the chip after the user has read every section (no more action to
  // surface). Re-show on remount if the read set ever shrinks (e.g., after
  // resetProgress).
  useEffect(() => {
    if (!mounted) return;
    setHidden(sections.length > 0 && sections.every((s) => readSet.has(s)));
  }, [mounted, sections, readSet]);

  if (!mounted) return null;
  if (sections.length === 0) return null;
  if (hidden) return null;

  const readCount = sections.filter((s) => readSet.has(s)).length;
  const nextUnread = sections.find((s) => !readSet.has(s));
  const fmtRead = lang === "ar" ? toArabicIndic(readCount) : readCount;
  const fmtTotal = lang === "ar" ? toArabicIndic(sections.length) : sections.length;

  return (
    <a
      href={nextUnread ? `#${nextUnread}` : undefined}
      className={cn(
        "fixed bottom-20 md:bottom-6 inset-inline-end-4 z-30",
        "inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-md",
        "bg-primary text-white hover:bg-primary/90 transition-colors min-h-[44px]",
      )}
      aria-label={t("learn.nextUnread")}
    >
      <span>{t("learn.sectionsRead").replace("{read}", String(fmtRead)).replace("{total}", String(fmtTotal))}</span>
      {nextUnread && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </a>
  );
}
