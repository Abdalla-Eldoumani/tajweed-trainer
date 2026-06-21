"use client";

import { useEffect, useState } from "react";

import { READER_PANEL_BREAKPOINT } from "@/lib/player-position";

// Reports whether the viewport is at or above the reader's panel/sheet boundary
// (READER_PANEL_BREAKPOINT): true = docked side panel, false = bottom sheet.
// Returns null until the post-mount effect measures, so the first client paint
// matches the empty server paint (no panel/sheet flash, no double surface during
// hydration). One matchMedia query drives it; a resize across the boundary swaps
// the result live with no reload. SSR-safe: with no window (or no matchMedia) it
// stays null and the effect is a no-op.
export function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia(`(min-width: ${READER_PANEL_BREAKPOINT}px)`);
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
