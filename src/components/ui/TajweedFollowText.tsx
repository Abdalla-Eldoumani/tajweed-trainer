"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { sanitizeTajweedHtml } from "@/lib/sanitize";
import { canAlign } from "@/lib/follow-along";
import { prefersReducedMotion } from "@/lib/reduced-motion";

interface TajweedFollowTextProps {
  // The SAME text_uthmani_tajweed markup TajweedText receives; sanitized
  // internally and injected byte-for-byte, never string-edited.
  tajweedHtml: string;
  // The 0-based visual word to light, or -1 when there is no active word.
  activeIdx: number;
  // wordCount(segments) for the alignment gate. The highlight is shown only when
  // this equals the rendered visual-word count (canAlign), so a divergence falls
  // back to no highlight rather than lighting a guessed word.
  segmentCount: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const FONT_SIZE_MAP: Record<string, "sm" | "md" | "lg" | "xl"> = {
  normal: "md",
  large: "lg",
  xlarge: "xl",
};

// The class the follow-along layer toggles on the active word's wrapper. Styled
// in globals.css (a token-driven wash + gold underline, reduced-motion-safe).
const ACTIVE_CLASS = "mushaf-word-active";
// The wrapper element this layer inserts around the active word's nodes. A custom
// tag name so a grouping pass never mistakes it for content, and so cleanup can
// find and unwrap exactly the nodes it inserted.
const WRAP_TAG = "mushaf-word";

// The follow-along highlight layer. It renders the verified colored markup
// UNCHANGED (the same sanitizeTajweedHtml output TajweedText injects) and marks
// the word currently being recited as a SEPARATE visual layer: it walks the
// rendered DOM read-only, groups the per-letter spans + text into visual words by
// splitting on whitespace text nodes, and wraps the active word in a class-bearing
// element. It NEVER edits the markup string, recolors a <tajweed> span, or
// re-tokenizes the text (CONST-01) — the letter colors come entirely from the
// untouched spans underneath. On any alignment mismatch or no active word it shows
// the plain markup with no highlight (silent fallback, never a wrong-word guess).
//
// Kept separate from TajweedText so the many read-only TajweedText uses are
// untouched; the reader swaps to this only for the one verse being recited.
export function TajweedFollowText({
  tajweedHtml,
  activeIdx,
  segmentCount,
  size,
  className,
}: TajweedFollowTextProps) {
  const { settings } = useSettings();
  const resolvedSize = size ?? FONT_SIZE_MAP[settings.fontSize] ?? "md";

  // Same sanitizer, same memoization as TajweedText: the injected string is
  // identical to the plain TajweedText branch. Never mutated downstream.
  const safeHtml = useMemo(() => sanitizeTajweedHtml(tajweedHtml), [tajweedHtml]);

  const containerRef = useRef<HTMLSpanElement | null>(null);
  // The wrapper currently holding the active word, so the next tick can unwrap it
  // (restoring the original nodes) before wrapping the new active word. Held in a
  // ref so it survives re-renders and the unmount cleanup can remove it.
  const activeWrapRef = useRef<HTMLElement | null>(null);

  // Unwrap the active word: move the wrapper's children back to its place and
  // remove the wrapper, leaving the original markup exactly as injected. Safe to
  // call when nothing is wrapped.
  const clearActive = () => {
    const wrap = activeWrapRef.current;
    if (!wrap) return;
    const parent = wrap.parentNode;
    if (parent) {
      while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap);
      parent.removeChild(wrap);
    }
    activeWrapRef.current = null;
  };

  // Re-evaluate the highlight after every render that can change which word is
  // active (the html re-injects on change; activeIdx/segmentCount change per
  // tick). The grouping is read-only; the only mutation is inserting/removing the
  // single wrapper element around the active word, which the verified markup
  // string never sees.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Always start from the unwrapped markup so grouping sees the original nodes
    // and a stale wrapper from the previous active word is gone.
    clearActive();

    if (activeIdx < 0) return;

    // Group the container's direct child nodes into visual words read-only. A new
    // word starts at each whitespace-only text node (the API separates words with
    // a space). The trailing <span class="end"> is the ayah number, not a recited
    // word, so it is excluded from the grouping entirely.
    const groups: Node[][] = [];
    let current: Node[] | null = null;
    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        if (text.trim() === "") {
          // Whitespace boundary: close the current word.
          current = null;
          continue;
        }
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).classList.contains("end")
      ) {
        // The ayah-number span: never part of a recited word; close any open word
        // so a following node (there is none in practice) starts fresh.
        current = null;
        continue;
      }
      if (!current) {
        current = [];
        groups.push(current);
      }
      current.push(node);
    }

    // The alignment gate: only highlight when the recited word count matches the
    // visual word count. Any mismatch (or no words) means we cannot say which
    // visual word the active segment maps to, so render the plain markup with no
    // highlight (the wrapper stays cleared above).
    if (!canAlign(segmentCount, groups.length)) return;
    if (activeIdx >= groups.length) return;

    const wordNodes = groups[activeIdx];
    if (!wordNodes || wordNodes.length === 0) return;

    // Wrap exactly the active word's nodes in one class-bearing element. This is
    // additive: the wrapper carries only the highlight class; the letter spans and
    // their colors inside it are untouched. Under reduced motion the class still
    // applies (the static wash + underline); there is no JS-driven glow to gate,
    // but reading the preference here keeps the gate explicit and ready if a
    // travelling effect is ever added.
    prefersReducedMotion();
    const first = wordNodes[0];
    const parent = first.parentNode;
    if (!parent) return;
    const wrap = document.createElement(WRAP_TAG);
    wrap.className = ACTIVE_CLASS;
    parent.insertBefore(wrap, first);
    for (const node of wordNodes) wrap.appendChild(node);
    activeWrapRef.current = wrap;
  }, [safeHtml, activeIdx, segmentCount]);

  // Remove the wrapper on unmount so a closed page leaves no orphan node. Runs
  // once (clearActive reads the ref), independent of the per-tick effect above.
  useEffect(() => clearActive, []);

  const sizeClasses = cn(
    "font-quran leading-[2] tajweed-text",
    {
      "text-arabic-sm": resolvedSize === "sm",
      "text-arabic-md": resolvedSize === "md",
      "text-arabic-lg": resolvedSize === "lg",
      "text-arabic-xl": resolvedSize === "xl",
    },
    className,
  );

  // Injected exactly as TajweedText's plain branch (same dir/lang, same classes,
  // the same sanitized html). The follow-along marking happens only in the effect
  // above, over this unchanged subtree.
  return (
    <span
      ref={containerRef}
      dir="rtl"
      lang="ar"
      className={sizeClasses}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
