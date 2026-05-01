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
        // Mirror the bookmark button's at-rest card-on-page tokens. The old
        // bg-cream pair was near-white in both modes (#FDF8F0 / #F5EDE0), so
        // the toggle read as a glaringly bright pill against the dark page.
        "border-gold-light/40 dark:border-gold-dark/30 hover:border-gold bg-bg-card dark:bg-bg-card-dark hover:bg-gold-light/15",
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
