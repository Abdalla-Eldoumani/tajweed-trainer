import { describe, it, expect } from "vitest";
import {
  clampPlayerPosition,
  reservedBottomFor,
  sanitizePlayerPosition,
  sheetBottomOffset,
  keyboardBottomOffset,
  BOTTOM_NAV_HEIGHT,
  MOBILE_BREAKPOINT,
  type PlayerSize,
  type Viewport,
} from "@/lib/player-position";

// Migrated from scripts/verify-player-position.mjs. Every assertion calls the
// REAL clamp/geometry exports so a regression in the arithmetic fails the suite;
// none of the math is re-derived here.

// A representative player box: narrower than the smallest viewport so the
// horizontal clamp has room, short enough to leave vertical travel.
const PLAYER: PlayerSize = { width: 320, height: 96 };

const VIEWPORTS: Viewport[] = [
  { width: 375, height: 667 }, // iPhone-class mobile
  { width: 768, height: 1024 }, // tablet / md breakpoint
  { width: 1440, height: 900 }, // desktop
];

// In-bounds, both extremes, negative, and absurd magnitudes a tampered store
// could carry through to a transform.
const STORED = [
  { x: 10, y: 10 },
  { x: 0, y: 0 },
  { x: -500, y: -500 },
  { x: 1_000_000, y: 1_000_000 },
  { x: -1e9, y: 1e9 },
  { x: 200, y: 600 },
];

describe("clampPlayerPosition - on-screen across breakpoints", () => {
  for (const vp of VIEWPORTS) {
    const reserved = reservedBottomFor(vp);
    const isMobile = vp.width < MOBILE_BREAKPOINT;
    const maxX = vp.width - PLAYER.width;
    const maxY = vp.height - PLAYER.height - reserved;

    it(`reserves ${isMobile ? BOTTOM_NAV_HEIGHT : 0}px at ${vp.width}px`, () => {
      expect(reserved).toBe(isMobile ? BOTTOM_NAV_HEIGHT : 0);
    });

    for (const stored of STORED) {
      it(`keeps (${stored.x},${stored.y}) on-screen at ${vp.width}px`, () => {
        const c = clampPlayerPosition(stored, vp, PLAYER);
        // Top-left within [0, max]; since max = viewport - box, the bottom-right
        // corner stays inside the viewport too.
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x).toBeLessThanOrEqual(maxX);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThanOrEqual(maxY);
      });

      it(`clears the reserved bottom strip for (${stored.x},${stored.y}) at ${vp.width}px`, () => {
        const c = clampPlayerPosition(stored, vp, PLAYER);
        const bottomEdge = c.y + PLAYER.height;
        expect(bottomEdge).toBeLessThanOrEqual(vp.height - reserved);
      });
    }
  }
});

describe("clampPlayerPosition - oversized box", () => {
  it("pins to the top-left (0,0) rather than a negative offset", () => {
    const tiny: Viewport = { width: 200, height: 150 };
    const big: PlayerSize = { width: 400, height: 300 };
    const c = clampPlayerPosition({ x: 50, y: 50 }, tiny, big);
    expect(c).toEqual({ x: 0, y: 0 });
  });
});

describe("sanitizePlayerPosition", () => {
  it("accepts a finite pair", () => {
    expect(sanitizePlayerPosition({ x: 12, y: 34 })).toEqual({ x: 12, y: 34 });
  });

  it("rejects every malformed shape", () => {
    const bad: unknown[] = [
      null,
      undefined,
      42,
      "x:1",
      {},
      { x: 1 },
      { y: 1 },
      { x: "1", y: 2 },
      { x: Number.NaN, y: 2 },
      { x: 1, y: Number.POSITIVE_INFINITY },
    ];
    for (const b of bad) {
      expect(sanitizePlayerPosition(b)).toBeNull();
    }
  });

  it("bounds an absurd-but-finite magnitude to 1e6 (live clamp finishes at mount)", () => {
    const s = sanitizePlayerPosition({ x: 1e12, y: -1e12 });
    expect(s).not.toBeNull();
    expect(Number.isFinite(s!.x)).toBe(true);
    expect(Number.isFinite(s!.y)).toBe(true);
    expect(Math.abs(s!.x)).toBeLessThanOrEqual(1e6);
    expect(Math.abs(s!.y)).toBeLessThanOrEqual(1e6);
  });
});

describe("sheetBottomOffset", () => {
  it("peek below 768 reserves the tab-bar strip", () => {
    expect(sheetBottomOffset({ width: 375, height: 667 }, false)).toBe(BOTTOM_NAV_HEIGHT);
  });

  it("expanded below 768 reserves nothing (the dismiss may cover the bar)", () => {
    expect(sheetBottomOffset({ width: 375, height: 667 }, true)).toBe(0);
  });

  it("peek in the 768-1023 band reserves nothing (sidebar, no tab bar)", () => {
    expect(sheetBottomOffset({ width: 900, height: 700 }, false)).toBe(0);
  });

  it("landmine: peek exactly at 768 reserves nothing (the md boundary is exclusive)", () => {
    expect(sheetBottomOffset({ width: MOBILE_BREAKPOINT, height: 1024 }, false)).toBe(0);
  });
});

describe("keyboardBottomOffset", () => {
  it("lifts the sheet by the hidden strip", () => {
    expect(keyboardBottomOffset(800, 500, 0)).toBe(300);
  });

  it("accounts for a visual-viewport top offset", () => {
    expect(keyboardBottomOffset(800, 500, 40)).toBe(260);
  });

  it("is 0 when the visual viewport fills the layout viewport", () => {
    expect(keyboardBottomOffset(800, 800, 0)).toBe(0);
  });

  it("never goes negative (a larger visual viewport clamps to 0)", () => {
    expect(keyboardBottomOffset(800, 900, 0)).toBe(0);
  });
});
