"use client";

import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";

interface TajweedTextProps {
  tajweedHtml: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  loading?: boolean;
}

const FONT_SIZE_MAP: Record<string, "sm" | "md" | "lg" | "xl"> = {
  normal: "md",
  large: "lg",
  xlarge: "xl",
};

export function TajweedText({ tajweedHtml, size, className, loading = false }: TajweedTextProps) {
  const { settings } = useSettings();
  const resolvedSize = size ?? FONT_SIZE_MAP[settings.fontSize] ?? "md";

  const sizeClasses = cn(
    "font-quran leading-[2] tajweed-text",
    {
      "text-arabic-sm": resolvedSize === "sm",
      "text-arabic-md": resolvedSize === "md",
      "text-arabic-lg": resolvedSize === "lg",
      "text-arabic-xl": resolvedSize === "xl",
    },
    className
  );

  if (loading) {
    return (
      <span className={cn(sizeClasses, "inline-block")}>
        <span className="inline-block h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </span>
    );
  }

  if (!tajweedHtml) {
    return (
      <span className={cn(sizeClasses, "text-text-muted text-sm")}>
        Unable to load tajweed text
      </span>
    );
  }

  return (
    <span
      dir="rtl"
      lang="ar"
      className={sizeClasses}
      dangerouslySetInnerHTML={{ __html: tajweedHtml }}
    />
  );
}
