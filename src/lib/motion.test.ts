import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { withThemeFade } from "@/lib/motion";

// withThemeFade must always run the update, mark <html> only while the theme
// eases, and skip the mark for a reduced-motion user. The setup shim reports
// matches:false, so the reduced-motion case stubs matchMedia per test.

const originalMatchMedia = window.matchMedia;
const root = document.documentElement;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  root.classList.remove("theme-fade");
});

describe("withThemeFade", () => {
  it("runs the update and marks <html> while the theme eases", () => {
    const update = vi.fn();
    withThemeFade(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(root.classList.contains("theme-fade")).toBe(true);
  });

  it("clears the mark once the fade window has passed", () => {
    withThemeFade(vi.fn());
    vi.advanceTimersByTime(599);
    expect(root.classList.contains("theme-fade")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(root.classList.contains("theme-fade")).toBe(false);
  });

  it("restarts the window when a second change follows the first", () => {
    withThemeFade(vi.fn());
    vi.advanceTimersByTime(400);
    withThemeFade(vi.fn());
    vi.advanceTimersByTime(400);
    expect(root.classList.contains("theme-fade")).toBe(true);
    vi.advanceTimersByTime(200);
    expect(root.classList.contains("theme-fade")).toBe(false);
  });

  it("runs the update with no mark under reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    const update = vi.fn();
    withThemeFade(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(root.classList.contains("theme-fade")).toBe(false);
  });
});
