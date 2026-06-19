// CSS handles reduced motion globally (the @media block in globals.css crushes
// animation and transition durations), but JS-driven scroll behavior
// (scrollIntoView({ behavior: "smooth" })) is not covered by that CSS rule, so
// callers gate "smooth" vs "auto" through this. SSR-safe and framework-free:
// returns false with no window so server render and first client paint agree.
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
