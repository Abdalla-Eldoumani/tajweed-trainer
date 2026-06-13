"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { sanitizeTajweedHtml } from "@/lib/sanitize";

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
  // Defense in depth: even though the markup comes from a trusted API, we run
  // it through a whitelist sanitizer that only permits <tajweed class=...>
  // and <span class="end"> before injecting it. See src/lib/sanitize.ts.
  const safeHtml = useMemo(() => sanitizeTajweedHtml(tajweedHtml), [tajweedHtml]);

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
        <span className="inline-block h-6 w-48 bg-bg-subtle dark:bg-bg-subtle-dark rounded animate-pulse" />
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
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
