// Wraps a state update so a theme change eases between colors instead of
// cutting. The easing is a color transition on the whole tree, switched on by a
// class on <html> for the length of the swap. It is not the View Transitions
// API: while a view transition runs, the browser hit-tests the page as one
// snapshot and every click or tap lands on <html> until the fade ends, which
// made the controls on the settings page unresponsive for about half a second
// after each theme change. A color transition leaves the page live throughout.
// A reduced-motion user gets the instant swap, and the update always runs.
import { prefersReducedMotion } from "./reduced-motion";

// The fade runs for the page motion token (420ms) once React has committed the
// new theme, so the class stays on a little longer than the transition itself.
const FADE_WINDOW_MS = 600;

let clearTimer: ReturnType<typeof setTimeout> | undefined;

export function withThemeFade(update: () => void): void {
  if (typeof document === "undefined" || prefersReducedMotion()) {
    update();
    return;
  }
  const root = document.documentElement;
  root.classList.add("theme-fade");
  update();
  if (clearTimer !== undefined) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    root.classList.remove("theme-fade");
    clearTimer = undefined;
  }, FADE_WINDOW_MS);
}
