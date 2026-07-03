import { describe, it, expect, afterEach, vi } from "vitest";
import {
  shouldNotify,
  isNotificationSupported,
  isInstalled,
} from "@/lib/notification-gate";

// notification-gate.ts is the pure fire-decision plus the SSR-safe capability
// detectors for the local revision reminder (REV-04). shouldNotify takes plain
// booleans and a count in, so its whole truth table is exercised without any
// browser Notification object. The two detectors read window / matchMedia
// guarded like reduced-motion.ts and are stubbed the same way reduced-motion's
// test stubs matchMedia. Originals are captured and restored after every test.

const originalMatchMedia = window.matchMedia;
const originalNotification = (window as { Notification?: unknown }).Notification;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  if (originalNotification === undefined) {
    delete (window as { Notification?: unknown }).Notification;
  } else {
    (window as { Notification?: unknown }).Notification = originalNotification;
  }
  // Drop any iOS standalone flag a test defined so isInstalled starts clean.
  delete (window.navigator as unknown as { standalone?: boolean }).standalone;
});

// Every gate open with a real due count; each truth-table case flips one field.
const ALL_OPEN = {
  installed: true,
  supported: true,
  permissionGranted: true,
  enabled: true,
  dueCount: 3,
};

describe("shouldNotify", () => {
  it("is true only when every gate is open and something is due", () => {
    expect(shouldNotify(ALL_OPEN)).toBe(true);
  });

  it("is false when the app is not installed", () => {
    expect(shouldNotify({ ...ALL_OPEN, installed: false })).toBe(false);
  });

  it("is false when the Notification API is unsupported", () => {
    expect(shouldNotify({ ...ALL_OPEN, supported: false })).toBe(false);
  });

  it("is false when permission is not granted", () => {
    expect(shouldNotify({ ...ALL_OPEN, permissionGranted: false })).toBe(false);
  });

  it("is false when the reminder is not opted in", () => {
    expect(shouldNotify({ ...ALL_OPEN, enabled: false })).toBe(false);
  });

  it("is false when nothing is due", () => {
    expect(shouldNotify({ ...ALL_OPEN, dueCount: 0 })).toBe(false);
  });

  it("is false for a negative due count", () => {
    expect(shouldNotify({ ...ALL_OPEN, dueCount: -1 })).toBe(false);
  });
});

describe("isNotificationSupported", () => {
  it("is true when window.Notification exists", () => {
    (window as { Notification?: unknown }).Notification = class {};
    expect(isNotificationSupported()).toBe(true);
  });

  it("is false when window.Notification is absent", () => {
    delete (window as { Notification?: unknown }).Notification;
    expect(isNotificationSupported()).toBe(false);
  });
});

describe("isInstalled", () => {
  it("is false with the default shim (not standalone, no iOS flag)", () => {
    expect(isInstalled()).toBe(false);
  });

  it("is true when the standalone display-mode query matches", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    expect(isInstalled()).toBe(true);
  });

  it("is true via the iOS navigator.standalone flag when the media query does not match", () => {
    Object.defineProperty(window.navigator, "standalone", {
      value: true,
      configurable: true,
    });
    expect(isInstalled()).toBe(true);
  });

  it("queries the standalone display-mode feature", () => {
    const spy = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    window.matchMedia = spy;
    isInstalled();
    expect(spy).toHaveBeenCalledWith("(display-mode: standalone)");
  });
});
