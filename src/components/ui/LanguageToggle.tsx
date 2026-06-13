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
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[36px]",
        // Both call sites (sidebar, mobile header) sit on the illuminated
        // margin, so the pill is styled for that navy ground in both themes.
        "border-[var(--margin-line)] bg-[var(--margin-card)] text-[var(--margin-text)] hover:border-gold",
        className
      )}
      aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
    >
      <span className={cn("transition-opacity", isAr ? "opacity-50" : "opacity-100 font-bold")}>EN</span>
      <span className="text-gold opacity-60">|</span>
      <span className={cn("font-arabic transition-opacity", isAr ? "opacity-100 font-bold" : "opacity-50")}>عربي</span>
    </button>
  );
}
