// Wraps a state update in the browser's View Transitions API so the swap
// crossfades instead of cutting. Two guards keep it safe everywhere: it
// feature-detects document.startViewTransition (Firefox and older Safari lack
// it, and must still apply the update with no error), and it honors
// prefersReducedMotion (a reduced-motion user gets an instant change, no
// animation). When either guard fails it just calls update() synchronously, so
// the caller's state change always happens regardless of support.
import { prefersReducedMotion } from "./reduced-motion";

// startViewTransition is not in the installed DOM lib types yet, so read it
// through a narrow local shape rather than augmenting the global Document.
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

export function withViewTransition(update: () => void): void {
  if (typeof document === "undefined" || prefersReducedMotion()) {
    update();
    return;
  }
  const start = (document as ViewTransitionDocument).startViewTransition;
  if (typeof start === "function") {
    start.call(document, update);
    return;
  }
  update();
}
