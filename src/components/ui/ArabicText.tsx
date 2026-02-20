"use client";

import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";

interface ArabicTextProps {
  text: string;
  quran?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const FONT_SIZE_MAP: Record<string, "sm" | "md" | "lg" | "xl"> = {
  normal: "md",
  large: "lg",
  xlarge: "xl",
};

export function ArabicText({ text, quran = false, size, className }: ArabicTextProps) {
  const { settings } = useSettings();

  // If no explicit size prop, derive from global font size setting
  const resolvedSize = size ?? FONT_SIZE_MAP[settings.fontSize] ?? "md";

  return (
    <span
      dir="rtl"
      lang="ar"
      className={cn(
        "leading-[2]",
        quran ? "font-quran" : "font-arabic",
        {
          "text-arabic-sm": resolvedSize === "sm",
          "text-arabic-md": resolvedSize === "md",
          "text-arabic-lg": resolvedSize === "lg",
          "text-arabic-xl": resolvedSize === "xl",
        },
        className
      )}
    >
      {text}
    </span>
  );
}
