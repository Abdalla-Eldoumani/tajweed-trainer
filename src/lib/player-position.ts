// Pure geometry for the movable mini-player. No React, no next, no DOM — so it
// is safe to import from server components and from a plain Node verify script
// (scripts/verify-player-position.mjs). The component measures the live viewport
// and the player box and feeds them in; this module only does the arithmetic.

export interface PlayerPosition {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface PlayerSize {
  width: number;
  height: number;
}

// The mobile bottom tab bar (Sidebar.tsx) is `h-16` = 64px and sits at the
// bottom on viewports below the md breakpoint. The dragged player must stay
// clear of it so the nav stays reachable, so on mobile we reserve this strip at
// the bottom of the travel area. Kept here as the single source the component
// and the verify script both read.
export const BOTTOM_NAV_HEIGHT = 64;

// Below this width the bottom tab bar is shown (Tailwind md = 768px). At and
// above it the nav moves to the side and the bottom strip is free.
export const MOBILE_BREAKPOINT = 768;

// One arrow-key press nudges the player this many pixels.
export const KEYBOARD_STEP = 16;

// A defensive absolute bound for a stored value before the live viewport is
// known. The real on-screen clamp runs at mount against the actual viewport;
// this only stops a tampered storage entry from carrying an absurd magnitude
// into a transform. Generous so it never fights a legitimate large desktop.
const MAX_STORED_COORD = 100000;

function clampNumber(value: number, min: number, max: number): number {
  // When the box is larger than the available space (min > max) pin to min, so
  // the top-left stays visible rather than snapping to a negative offset.
  if (max < min) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// How much of the bottom must be left free for the given viewport. Only the
// mobile width reserves the tab-bar strip; wider viewports reserve nothing.
export function reservedBottomFor(viewport: Viewport): number {
  return viewport.width < MOBILE_BREAKPOINT ? BOTTOM_NAV_HEIGHT : 0;
}

// Clamp a top-left position so the whole player box stays inside the viewport
// and above the reserved bottom strip. This is the function the live drag,
// resize, orientationchange, and keyboard nudge all route through, and the one
// the verify script tests. Pure: no DOM, no globals.
export function clampPlayerPosition(
  pos: PlayerPosition,
  viewport: Viewport,
  player: PlayerSize,
  reservedBottom = reservedBottomFor(viewport),
): PlayerPosition {
  const maxX = viewport.width - player.width;
  const maxY = viewport.height - player.height - reservedBottom;
  return {
    x: clampNumber(pos.x, 0, maxX),
    y: clampNumber(pos.y, 0, maxY),
  };
}

// Validate a stored position shape on read. Returns null for anything that is
// not a pair of finite numbers, or null when both are absurd. The precise
// on-screen correction happens at mount via clampPlayerPosition once the
// viewport is measurable; storage cannot know the viewport, so it only rejects
// malformed or wildly out-of-range values here.
export function sanitizePlayerPosition(input: unknown): PlayerPosition | null {
  if (typeof input !== "object" || input === null) return null;
  const obj = input as Record<string, unknown>;
  const x = obj.x;
  const y = obj.y;
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  if (typeof y !== "number" || !Number.isFinite(y)) return null;
  return {
    x: clampNumber(x, -MAX_STORED_COORD, MAX_STORED_COORD),
    y: clampNumber(y, -MAX_STORED_COORD, MAX_STORED_COORD),
  };
}
