"use client";

import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { settings, updateSettings } = useSettings();
  const isAr = settings.language === "ar";

  return (
    <button
      onClick={() => updateSettings({ language: isAr ? "en" : "ar" })}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[44px]",
        // Both call sites (sidebar, mobile header) sit on the illuminated
        // margin, so the pill is styled for that navy ground in both themes.
        "border-[var(--margin-line)] bg-[var(--margin-card)] text-[var(--margin-text)] hover:border-gold",
        className
      )}
      aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
    >
      <span className={cn("transition-colors", isAr ? "text-[var(--margin-muted)]" : "font-bold")}>EN</span>
      <span aria-hidden="true" className="h-4 w-px bg-[var(--margin-line)]" />
      <span className={cn("font-arabic transition-colors", isAr ? "font-bold" : "text-[var(--margin-muted)]")}>عربي</span>
    </button>
  );
}
