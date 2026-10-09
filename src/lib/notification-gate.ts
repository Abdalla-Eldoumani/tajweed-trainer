// The local revision reminder's fire-decision plus the two browser-capability
// detectors it depends on. Pure of app state: shouldNotify takes plain
// booleans and a count in and returns a boolean, so the whole gating truth
// table is unit-testable without a real Notification object. The two detectors
// are SSR-safe window reads mirroring reduced-motion.ts — false with no window,
// so a server render never throws. No React / next / storage imports, so this
// file is counted by the src/lib coverage gate.

export interface NotifyDecisionParams {
  /** Running as an installed PWA (see isInstalled). */
  installed: boolean;
  /** The browser exposes the Notification API (see isNotificationSupported). */
  supported: boolean;
  /** Notification.permission === "granted". */
  permissionGranted: boolean;
  /** The user opted in via settings.revisionRemindersEnabled. */
  enabled: boolean;
  /** How many verses are due for revision right now. */
  dueCount: number;
}

// Fire the local reminder only when every gate is open and something is due.
// Pure: reads no window and has no side effect — the caller supplies each
// signal, which is what keeps the gating logic testable without the browser
// Notification object. Any single false gate (or nothing due) blocks the fire.
export function shouldNotify(params: NotifyDecisionParams): boolean {
  const { installed, supported, permissionGranted, enabled, dueCount } = params;
  return installed && supported && permissionGranted && enabled && dueCount > 0;
}

// Whether the Notification API exists at all. SSR-safe: false with no window.
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

// Whether the app is running as an installed PWA. The display-mode media query
// is the synchronous, cross-engine signal; navigator.standalone is the iOS
// Safari legacy flag (absent from the TS lib types, so cast through unknown).
// getInstalledRelatedApps is deliberately NOT used — it is Android-only, async,
// and needs a related_applications manifest entry the app does not ship.
// SSR-safe: false with no window.
export function isInstalled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}
