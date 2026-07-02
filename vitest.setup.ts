// The /vitest entry auto-extends Vitest's `expect` with the jest-dom matchers
// (the bare `@testing-library/jest-dom` entry targets Jest and would not).
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement matchMedia; reduced-motion.ts and withViewTransition
// read it, and components under RTL may too. A no-op stub returning matches:false
// keeps those reads defined.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom implements neither observer. useReadSections uses IntersectionObserver;
// assorted components use ResizeObserver. No-op class stubs are enough here.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

globalThis.IntersectionObserver ??= class {
  root = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// jsdom persists localStorage across tests in a file; RTL leaves mounted trees
// behind. Reset both after every test so each starts from empty progress.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
