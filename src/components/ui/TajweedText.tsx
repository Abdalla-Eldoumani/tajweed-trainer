"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // Opt-in: a color-coded letter that maps to a known rule reveals a small
  // popover naming that rule (with its swatch and a "Learn more" link). Off by
  // default so the many read-only uses of this component are unchanged.
  //
  // Reader conflict (tap-to-play): in the Mushaf the verse is a button that
  // opens the verse overlay and this text is its child, so the letter gesture
  // must not hijack the plain tap. The rule popover therefore opens on a hover
  // (mouse/pen) or a deliberate long-press (touch); a plain tap/click does
  // nothing locally and bubbles to the verse so the overlay still opens. A
  // fired long-press suppresses exactly the one synthetic click that follows so
  // it does not also open the overlay. An uncolored glyph, or a colored letter
  // with no known rule, always bubbles. The trigger is detected from the
  // event's pointerType, never a media query, so a hybrid device behaves per
  // the actual gesture used.
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

  // Gesture timers/flags live in refs so they survive re-renders and the cleanup
  // effect can clear a pending timer on unmount. openTimer holds the armed hover
  // or long-press timer; longPressStart is the touch start point used to cancel
  // the long-press on movement; suppressNextClick eats the one synthetic click
  // that follows a fired long-press so it does not also reach the verse button.
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current !== null) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  // The reusable core, shared by both triggers: find the nearest <tajweed>
  // ancestor of the event target, resolve a KNOWN rule, and open the popover
  // anchored at the letter's rect. Returns early (no-op) for an uncolored glyph
  // (no <tajweed> ancestor) or a colored letter whose class is not a known rule,
  // so those gestures are left to bubble. autoFocus moves focus to the lesson
  // link only on a deliberate (long-press) open, never on hover.
  const openForEvent = useCallback(
    (target: EventTarget | null, autoFocus: boolean) => {
      const tag = (target as HTMLElement | null)?.closest("tajweed");
      if (!tag) return;
      const cssClass = tag.getAttribute("class")?.trim() ?? "";
      if (!cssClass || !getColorForClass(cssClass)) return;
      const rect = tag.getBoundingClientRect();
      setRuleTarget({
        cssClass,
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
        autoFocus,
      });
    },
    [],
  );

  // Hover (mouse/pen): arm a short flicker-guard delay, then open without taking
  // focus. Re-arming on move keeps the target current as the pointer slides
  // across letters; leaving clears any pending open. Touch is excluded here so a
  // tap-drag never opens via hover. The popover's own pointer-leave/Escape/scroll
  // dismissal closes it.
  const HOVER_DELAY_MS = 140;
  const onPointerEnter = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (e.pointerType === "touch") return;
      const target = e.target;
      clearOpenTimer();
      openTimer.current = setTimeout(() => openForEvent(target, false), HOVER_DELAY_MS);
    },
    [clearOpenTimer, openForEvent],
  );

  // Long-press (touch): arm a deliberate ~500ms timer; cancel it if the finger
  // moves beyond a small threshold (a scroll/drag, not a press). When it fires,
  // open with focus AND set the suppress flag so the click that follows release
  // does not also open the verse overlay. A quick tap leaves the timer un-fired
  // and bubbles normally.
  const LONG_PRESS_MS = 500;
  const MOVE_CANCEL_PX = 10;
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (e.pointerType === "touch") {
        const start = longPressStart.current;
        if (
          start &&
          (Math.abs(e.clientX - start.x) > MOVE_CANCEL_PX ||
            Math.abs(e.clientY - start.y) > MOVE_CANCEL_PX)
        ) {
          clearOpenTimer();
          longPressStart.current = null;
        }
        return;
      }
      // Mouse/pen: keep the hover target current as the pointer slides.
      const target = e.target;
      clearOpenTimer();
      openTimer.current = setTimeout(() => openForEvent(target, false), HOVER_DELAY_MS);
    },
    [clearOpenTimer, openForEvent],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (e.pointerType !== "touch") return;
      const target = e.target;
      longPressStart.current = { x: e.clientX, y: e.clientY };
      clearOpenTimer();
      openTimer.current = setTimeout(() => {
        suppressNextClick.current = true;
        openForEvent(target, true);
      }, LONG_PRESS_MS);
    },
    [clearOpenTimer, openForEvent],
  );

  const endGesture = useCallback(() => {
    clearOpenTimer();
    longPressStart.current = null;
  }, [clearOpenTimer]);

  // Eat exactly one click when a long-press just fired (otherwise it would also
  // open the verse overlay), then reset. A plain tap leaves the flag false and
  // bubbles to the verse button.
  const onClickCapture = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      e.stopPropagation();
    }
  }, []);

  // Clear any pending hover/long-press timer on unmount so it never fires after
  // the component is gone.
  useEffect(() => clearOpenTimer, [clearOpenTimer]);

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

  // explainRules on: the injected text gets the hover/long-press gesture, and the
  // popover renders alongside (it portals to the body, so it never affects the
  // verse layout). The handler element can't also hold React children, so the
  // popover is a sibling. The wrapper is display:contents so it adds no box. No
  // plain-click handler here: a plain tap bubbles to the verse button.
  return (
    <span style={{ display: "contents" }}>
      <span
        dir="rtl"
        lang="ar"
        className={sizeClasses}
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={endGesture}
        onPointerDown={onPointerDown}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onClickCapture={onClickCapture}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
      <TajweedRulePopover target={ruleTarget} onClose={() => setRuleTarget(null)} />
    </span>
  );
}
