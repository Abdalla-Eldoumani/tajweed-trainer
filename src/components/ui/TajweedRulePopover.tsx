"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { getColorForClass } from "@/lib/tajweed-colors";
import { getLessonLinkForClass } from "@/lib/tajweed-rule-links";

// What a tapped letter resolves to: the API class plus the point to anchor at
// (the tapped letter's bounding rect in viewport coordinates).
export interface RulePopoverTarget {
  cssClass: string;
  rect: { top: number; bottom: number; left: number; right: number };
}

interface TajweedRulePopoverProps {
  target: RulePopoverTarget | null;
  onClose: () => void;
}

// Card geometry used to clamp the popover inside the viewport.
const CARD_WIDTH = 240;
const MARGIN = 8;
const GAP = 8;
const EST_HEIGHT = 96;

// A supplementary discovery aid: tap a color-coded letter and this names the
// tajweed rule that colors it, shows its swatch, and links to the lesson. It
// describes nothing about the rule (binding content rule); the name and color
// come from the verified tajweed map, the link from the structural route map.
//
// The trigger is an injected inline letter, not a focusable control, so this is
// not part of the tab order. The same rule information is fully keyboard
// reachable through the lessons and the color legend; this is a pointer-first
// shortcut layered on top, never the only path to it.
export function TajweedRulePopover({ target, onClose }: TajweedRulePopoverProps) {
  const { t, isAr } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const color = target ? getColorForClass(target.cssClass) : undefined;
  const link = target ? getLessonLinkForClass(target.cssClass) : null;

  // Position after layout so the real card height feeds the clamp. Placed below
  // the letter by default, flipped above when it would overflow the bottom edge.
  // Horizontal centering is clamped to the viewport; this is the same math under
  // LTR and RTL because it works in absolute viewport pixels, so it stays
  // on-screen in both directions without mirrored logic.
  useLayoutEffect(() => {
    if (!target) {
      setPos(null);
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const height = cardRef.current?.offsetHeight ?? EST_HEIGHT;
    const r = target.rect;

    const centerX = (r.left + r.right) / 2;
    let left = centerX - CARD_WIDTH / 2;
    left = Math.max(MARGIN, Math.min(left, vw - CARD_WIDTH - MARGIN));

    let top = r.bottom + GAP;
    if (top + height > vh - MARGIN) {
      const above = r.top - GAP - height;
      top = above >= MARGIN ? above : Math.max(MARGIN, vh - height - MARGIN);
    }
    setPos({ top, left });
  }, [target]);

  // Move focus to the link when the popover opens with one, so a keyboard user
  // who triggered it can act on it and Escape returns control predictably.
  useEffect(() => {
    if (target && link) linkRef.current?.focus();
  }, [target, link]);

  // Escape closes; a pointer/tap outside the card closes. Both are document
  // listeners (the trigger is injected markup, not a React child), guarded so
  // they only run while open.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey, true);
    // Defer attaching the outside-pointer listener so the opening tap that
    // spawned the popover does not immediately close it.
    const id = requestAnimationFrame(() =>
      document.addEventListener("pointerdown", onPointer, true),
    );
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [target, onClose]);

  if (!mounted || !target || !color) return null;

  const ruleName = isAr ? color.nameAr : color.nameEn;
  const swatch = `var(--tajweed-${color.cssClass})`;

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={t("ruleInfo.label")}
      dir={isAr ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: CARD_WIDTH,
        boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)",
        visibility: pos ? "visible" : "hidden",
      }}
      className="z-[70] rounded-xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark p-3"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 shrink-0 rounded-full border"
          style={{ backgroundColor: swatch, borderColor: "var(--gold-hairline)" }}
        />
        <span className="min-w-0">
          <span className="block text-micro uppercase tracking-[0.08em] text-text-muted">
            {t("ruleInfo.label")}
          </span>
          <span className="block font-heading text-small font-semibold text-text dark:text-text-dark truncate">
            {ruleName}
          </span>
        </span>
      </div>

      {link && (
        <Link
          ref={linkRef}
          href={link}
          onClick={onClose}
          className="mt-2 inline-flex items-center gap-1 rounded-md px-1 -mx-1 text-micro text-primary dark:text-primary-light hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1"
        >
          {t("ruleInfo.learnMore").replace("{rule}", ruleName)}
          <span aria-hidden="true">{isAr ? "←" : "→"}</span>
        </Link>
      )}
    </div>,
    document.body,
  );
}
