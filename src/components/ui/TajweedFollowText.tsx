"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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
  // Reveal-as-recited: when true, every word AHEAD of the active word (index
  // > activeIdx) is blurred and words up to and including it show through, by
  // toggling .mushaf-word-blurred on the same read-only word grouping. Gated on
  // the same canAlign check as the highlight, so a segment mismatch blurs nothing
  // here (the caller falls back to the whole-verse blur). Default false keeps the
  // plain highlight behavior untouched.
  blurUnrevealed?: boolean;
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
// The class for a word not yet recited in reveal-as-recited mode. Styled in
// globals.css with the SAME blur/dim the whole-verse recall blur uses.
const BLURRED_CLASS = "mushaf-word-blurred";
// A marker on the container root set ONLY while per-word reveal is actually
// engaged (reveal mode on AND segments align). It tells globals.css to drop any
// whole-verse blur the caller put on this element, so the per-word .mushaf-word-
// blurred wrappers become the single blur source and revealed words show through.
// When reveal cannot align it is absent, so the caller's whole-verse blur stands
// as the fallback (the recall path stays hidden; FOLLOW-05).
const REVEAL_ACTIVE_CLASS = "mushaf-reveal-active";
// The wrapper element this layer inserts around a word's nodes (the active word
// and, in reveal mode, each unrevealed word). A custom tag name so a grouping
// pass never mistakes it for content, and so cleanup can find and unwrap exactly
// the nodes it inserted.
const WRAP_TAG = "mushaf-word";

// The follow-along highlight layer. It renders the verified colored markup
// UNCHANGED (the same sanitizeTajweedHtml output TajweedText injects) and marks
// the word currently being recited as a SEPARATE visual layer: it walks the
// rendered DOM read-only, groups the per-letter spans + text into visual words by
// splitting on whitespace text nodes, and wraps the active word in a class-bearing
// element. With blurUnrevealed on it ALSO wraps every word ahead of the active one
// in a blurred wrapper (reveal-as-recited): the same grouping drives both, so the
// reveal and the highlight stay in lockstep. It NEVER edits the markup string,
// recolors a <tajweed> span, or re-tokenizes the text (CONST-01) — the letter
// colors come entirely from the untouched spans underneath. On any alignment
// mismatch it shows the plain markup with no highlight and no blur (silent
// fallback; the caller handles the whole-verse blur for reveal mode).
//
// Kept separate from TajweedText so the many read-only TajweedText uses are
// untouched; the reader swaps to this only for the one verse being recited.
export function TajweedFollowText({
  tajweedHtml,
  activeIdx,
  segmentCount,
  blurUnrevealed = false,
  size,
  className,
}: TajweedFollowTextProps) {
  const { settings } = useSettings();
  const resolvedSize = size ?? FONT_SIZE_MAP[settings.fontSize] ?? "md";

  // Same sanitizer, same memoization as TajweedText: the injected string is
  // identical to the plain TajweedText branch. Never mutated downstream.
  const safeHtml = useMemo(() => sanitizeTajweedHtml(tajweedHtml), [tajweedHtml]);

  const containerRef = useRef<HTMLSpanElement | null>(null);
  // Every wrapper this layer inserted (the one active-word wrapper plus, in reveal
  // mode, one per unrevealed word), so the next tick can unwrap them all (restoring
  // the original nodes) before re-grouping, and the unmount cleanup can remove
  // them. Held in a ref so it survives re-renders.
  const wrapsRef = useRef<HTMLElement[]>([]);

  // Unwrap one wrapper element: move its children back to its place and remove it,
  // leaving the original nodes exactly as injected. Stable (touches no reactive
  // value) so the effects can depend on it without re-running every render.
  const unwrap = useCallback((wrap: HTMLElement) => {
    const parent = wrap.parentNode;
    if (!parent) return;
    while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap);
    parent.removeChild(wrap);
  }, []);

  // Unwrap every wrapper this layer inserted, restoring the markup to exactly the
  // injected DOM, and drop the reveal-active marker. Safe to call when nothing is
  // wrapped.
  const clearWraps = useCallback(() => {
    for (const wrap of wrapsRef.current) unwrap(wrap);
    wrapsRef.current = [];
    containerRef.current?.classList.remove(REVEAL_ACTIVE_CLASS);
  }, [unwrap]);

  // Wrap a word's nodes in one class-bearing element and track it for cleanup.
  // Additive only: the wrapper carries just the class; the letter spans and their
  // colors inside are untouched. Returns silently if the group is empty or
  // detached so a degenerate verse never throws.
  const wrapWord = useCallback((wordNodes: Node[], className: string) => {
    if (wordNodes.length === 0) return;
    const first = wordNodes[0];
    const parent = first.parentNode;
    if (!parent) return;
    const wrap = document.createElement(WRAP_TAG);
    wrap.className = className;
    parent.insertBefore(wrap, first);
    for (const node of wordNodes) wrap.appendChild(node);
    wrapsRef.current.push(wrap);
  }, []);

  // Re-evaluate the highlight (and the reveal blur) after every render that can
  // change which word is active (the html re-injects on change;
  // activeIdx/segmentCount/blurUnrevealed change per tick). The grouping is
  // read-only; the only mutation is inserting/removing wrapper elements around
  // whole words, which the verified markup string never sees.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Always start from the unwrapped markup so grouping sees the original nodes
    // and stale wrappers from the previous tick are gone.
    clearWraps();

    // Nothing to do when there is no active word AND reveal mode is off: the plain
    // markup shows. In reveal mode a negative activeIdx (paused before the first
    // word, between words) still blurs every word, so do not early-return there.
    if (activeIdx < 0 && !blurUnrevealed) return;

    // Group the container's content into visual words read-only. The API
    // separates words with a space, but those spaces sit INSIDE text nodes (one
    // node like "word1 word2 word3 "), not as standalone whitespace nodes, and a
    // single word can span several nodes (plain text + <tajweed> letter spans).
    // So subdivide each text node at its spaces into word-piece and space
    // fragments -- a read-only split of PLAIN TEXT that never touches a <tajweed>
    // span, its letters, or their order (CONST-01) -- then accumulate runs of
    // non-space nodes into words. A space fragment (and the trailing
    // <span class="end"> ayah number, excluded) closes the current word.
    const groups: Node[][] = [];
    let current: Node[] | null = null;
    for (const node of Array.from(container.childNodes)) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).classList.contains("end")
      ) {
        // The ayah-number span: never part of a recited word.
        current = null;
        continue;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        if (text === "") continue;
        // Keep the whitespace runs as separators so each becomes a boundary.
        const parts = text.split(/(\s+)/).filter((s) => s !== "");
        let pieces: Node[];
        if (parts.length > 1) {
          // Replace the mixed text node with one fragment per piece so a word's
          // nodes are concrete and wrappable; the exact characters are preserved.
          const parent = node.parentNode;
          pieces = parts.map((part) => document.createTextNode(part));
          for (const piece of pieces) parent?.insertBefore(piece, node);
          parent?.removeChild(node);
        } else {
          // Already a single piece (a word fragment or a lone whitespace run).
          pieces = [node];
        }
        for (const piece of pieces) {
          if ((piece.textContent ?? "").trim() === "") {
            // A space fragment: close the current word.
            current = null;
            continue;
          }
          if (!current) {
            current = [];
            groups.push(current);
          }
          current.push(piece);
        }
        continue;
      }
      // A <tajweed> letter span (or any inline element): part of the current word.
      if (!current) {
        current = [];
        groups.push(current);
      }
      current.push(node);
    }

    // The alignment gate: only mark words when the recited word count matches the
    // visual word count. Any mismatch (or no words) means we cannot say which
    // visual word maps to which segment, so render the plain markup unmarked — no
    // highlight and no per-word blur (the reveal caller falls back to the
    // whole-verse blur). A wrong-word highlight or blur is worse than none.
    if (!canAlign(segmentCount, groups.length)) return;

    // Reduced motion is read so the static-under-reduced-motion contract is
    // explicit; the wash/underline and the blur are state changes (the CSS drops
    // their transitions), and there is no JS-driven travelling effect to gate.
    prefersReducedMotion();

    // Reveal-as-recited: blur every word AHEAD of the active one. Words up to and
    // including activeIdx (and, with a negative activeIdx, none) carry no class and
    // show through. Done first, then the active word is wrapped on top, so the two
    // never fight over the same word (the active word is always <= activeIdx). The
    // marker tells globals.css to drop the caller's whole-verse blur now that the
    // per-word wrappers are the blur source; without it the caller's blur stands as
    // the fallback (reached only when canAlign fails, above).
    if (blurUnrevealed) {
      container.classList.add(REVEAL_ACTIVE_CLASS);
      for (let i = 0; i < groups.length; i++) {
        if (i > activeIdx) wrapWord(groups[i], BLURRED_CLASS);
      }
    }

    // The active word's highlight wrapper (only when there is a real active word
    // in range).
    if (activeIdx >= 0 && activeIdx < groups.length) {
      wrapWord(groups[activeIdx], ACTIVE_CLASS);
    }
  }, [safeHtml, activeIdx, segmentCount, blurUnrevealed, clearWraps, wrapWord]);

  // Remove every wrapper on unmount so a closed page leaves no orphan node. Runs
  // once (clearWraps reads the ref), independent of the per-tick effect above.
  useEffect(() => clearWraps, [clearWraps]);

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
