"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { sanitizeTajweedHtml } from "@/lib/sanitize";
import { getColorForClass } from "@/lib/tajweed-colors";
import {
  TajweedRulePopover,
  type RulePopoverTarget,
} from "./TajweedRulePopover";

interface TajweedTextProps {
  tajweedHtml: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  loading?: boolean;
  // Opt-in: tapping a color-coded letter opens a small popover naming the
  // tajweed rule that colors it (with its swatch and a "Learn more" link).
  // Off by default so the many read-only uses of this component are unchanged.
  //
  // Reader conflict (tap-to-play): in the Mushaf the verse is a button that
  // plays audio and this text is its child, so a letter tap would bubble up and
  // also start playback. The delegated handler resolves this by calling
  // stopPropagation ONLY when a colored letter with a known rule is tapped:
  // that tap explains the rule and does not play, while a tap on any
  // non-colored glyph does not stop propagation and still reaches the play
  // button. So in the reader a colored letter teaches its rule and the rest of
  // the verse plays it, with no double-fire.
  explainRules?: boolean;
}

const FONT_SIZE_MAP: Record<string, "sm" | "md" | "lg" | "xl"> = {
  normal: "md",
  large: "lg",
  xlarge: "xl",
};

export function TajweedText({ tajweedHtml, size, className, loading = false, explainRules = false }: TajweedTextProps) {
  const { settings } = useSettings();
  const resolvedSize = size ?? FONT_SIZE_MAP[settings.fontSize] ?? "md";
  const [ruleTarget, setRuleTarget] = useState<RulePopoverTarget | null>(null);
  // Defense in depth: even though the markup comes from a trusted API, we run
  // it through a whitelist sanitizer that only permits <tajweed class=...>
  // and <span class="end"> before injecting it. See src/lib/sanitize.ts.
  const safeHtml = useMemo(() => sanitizeTajweedHtml(tajweedHtml), [tajweedHtml]);

  // Delegated click: the markup is injected via dangerouslySetInnerHTML, so we
  // listen on the wrapper and find the nearest <tajweed> ancestor of the tapped
  // node. A tap on an uncolored glyph (no <tajweed> ancestor, or one whose class
  // is not a known rule) is a no-op and is left to bubble (see explainRules).
  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const tag = (e.target as HTMLElement | null)?.closest("tajweed");
    if (!tag) return;
    const cssClass = tag.getAttribute("class")?.trim() ?? "";
    if (!cssClass || !getColorForClass(cssClass)) return;
    // A colored, known rule was tapped: own this gesture so the reader's verse
    // play button does not also fire, and open the popover anchored at the letter.
    e.stopPropagation();
    const rect = tag.getBoundingClientRect();
    setRuleTarget({
      cssClass,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
    });
  }, []);

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
        <span className="inline-block h-6 w-48 bg-bg-subtle dark:bg-bg-subtle-dark rounded animate-pulse motion-reduce:animate-none" />
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

  if (!explainRules) {
    return (
      <span
        dir="rtl"
        lang="ar"
        className={sizeClasses}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  // explainRules on: the injected text gets the delegated click handler, and the
  // popover renders alongside (it portals to the body, so it never affects the
  // verse layout). The handler element can't also hold React children, so the
  // popover is a sibling. The wrapper is display:contents so it adds no box.
  return (
    <span style={{ display: "contents" }}>
      <span
        dir="rtl"
        lang="ar"
        className={sizeClasses}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
      <TajweedRulePopover target={ruleTarget} onClose={() => setRuleTarget(null)} />
    </span>
  );
}
