import { describe, it, expect, afterEach, vi } from "vitest";
import { prefersReducedMotion } from "@/lib/reduced-motion";

// New coverage for the pure reduced-motion read. prefersReducedMotion() is the
// single gate for JS-driven smooth scroll, so both branches of the media query
// are exercised. The vitest.setup shim provides matchMedia returning
// matches:false; the matches:true case stubs it per test and restores after.

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("prefersReducedMotion", () => {
  it("returns false with the default shim (matches:false)", () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when the media query reports matches:true", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(true);
  });

  it("queries the reduce media feature", () => {
    const spy = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    window.matchMedia = spy;
    prefersReducedMotion();
    expect(spy).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
