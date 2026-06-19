#!/usr/bin/env node
// Pure, offline check of the movable-player clamp math. Imports the real
// arithmetic from src/lib/player-position.ts (Node strips the TS types; the
// module has no runtime imports) so this verifies the same code the component
// runs, not a re-implementation. Asserts that any stored corner — including
// wildly out-of-bounds and negative — is corrected fully on-screen and clear of
// the reserved bottom strip on mobile, and that the storage shape check rejects
// malformed input.

import {
  clampPlayerPosition,
  reservedBottomFor,
  sanitizePlayerPosition,
  sheetBottomOffset,
  keyboardBottomOffset,
  BOTTOM_NAV_HEIGHT,
  MOBILE_BREAKPOINT,
} from "../src/lib/player-position.ts";

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

// A representative player box. Narrower than the smallest viewport so the
// horizontal clamp has room to work; the height leaves vertical travel too.
const PLAYER = { width: 320, height: 96 };

const VIEWPORTS = [
  { width: 375, height: 667 }, // iPhone-class mobile
  { width: 768, height: 1024 }, // tablet / md breakpoint
  { width: 1440, height: 900 }, // desktop
];

// Stored corners to feed through the clamp: in-bounds, both extremes, negative,
// and absurd magnitudes a tampered store could carry.
const STORED = [
  { x: 10, y: 10 },
  { x: 0, y: 0 },
  { x: -500, y: -500 },
  { x: 1_000_000, y: 1_000_000 },
  { x: -1e9, y: 1e9 },
  { x: 200, y: 600 },
];

for (const vp of VIEWPORTS) {
  const reserved = reservedBottomFor(vp);
  const isMobile = vp.width < MOBILE_BREAKPOINT;
  const maxX = vp.width - PLAYER.width;
  const maxY = vp.height - PLAYER.height - reserved;

  // Reserved strip is exactly the nav height on mobile, zero otherwise.
  record(
    `reservedBottomFor ${vp.width}px = ${isMobile ? BOTTOM_NAV_HEIGHT : 0}`,
    reserved === (isMobile ? BOTTOM_NAV_HEIGHT : 0),
    `got ${reserved}`,
  );

  for (const stored of STORED) {
    const c = clampPlayerPosition(stored, vp, PLAYER);
    // Fully on-screen: top-left within [0, max], and since max = viewport - box,
    // the bottom-right corner stays inside the viewport too.
    const onScreenX = c.x >= 0 && c.x <= maxX;
    const onScreenY = c.y >= 0 && c.y <= maxY;
    record(
      `clamp keeps (${stored.x},${stored.y}) on-screen at ${vp.width}px`,
      onScreenX && onScreenY,
      `-> (${c.x},${c.y}), bounds x<=${maxX} y<=${maxY}`,
    );
    // The bottom edge of the box must not enter the reserved strip on mobile.
    const bottomEdge = c.y + PLAYER.height;
    record(
      `clamp clears the bottom nav for (${stored.x},${stored.y}) at ${vp.width}px`,
      bottomEdge <= vp.height - reserved,
      `bottom ${bottomEdge} vs limit ${vp.height - reserved}`,
    );
  }
}

// When the box is wider/taller than the space, the clamp pins to the top-left
// (0,0) rather than producing a negative offset that would hide the corner.
{
  const tiny = { width: 200, height: 150 };
  const big = { width: 400, height: 300 };
  const c = clampPlayerPosition({ x: 50, y: 50 }, tiny, big);
  record("oversized box pins to top-left", c.x === 0 && c.y === 0, `-> (${c.x},${c.y})`);
}

// sanitizePlayerPosition: accepts a finite pair, rejects everything malformed.
record("sanitize accepts a finite pair", sanitizePlayerPosition({ x: 12, y: 34 }) !== null);
const bad = [
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
const allRejected = bad.every((b) => sanitizePlayerPosition(b) === null);
record("sanitize rejects malformed input", allRejected, `${bad.length} cases`);

// An absurd-but-finite stored magnitude survives the shape check (it is finite)
// but is bounded to a sane range; the live viewport clamp finishes the job.
{
  const s = sanitizePlayerPosition({ x: 1e12, y: -1e12 });
  record(
    "sanitize bounds absurd finite magnitudes",
    s !== null && Number.isFinite(s.x) && Number.isFinite(s.y) && Math.abs(s.x) <= 1e6 && Math.abs(s.y) <= 1e6,
    s ? `-> (${s.x},${s.y})` : "null",
  );
}

// sheetBottomOffset: the v0.6.0 bottom-sheet reserves the tab-bar strip only in
// the peek state below 768px; the expanded sheet (with a dismiss) reserves
// nothing, and any width >= 768 reserves nothing (no tab bar there).
record(
  "sheet peek below 768 reserves the tab bar",
  sheetBottomOffset({ width: 375, height: 667 }, false) === BOTTOM_NAV_HEIGHT,
  `got ${sheetBottomOffset({ width: 375, height: 667 }, false)}`,
);
record(
  "sheet expanded below 768 reserves nothing (may cover the bar)",
  sheetBottomOffset({ width: 375, height: 667 }, true) === 0,
);
record(
  "sheet peek in the 768-1023 band reserves nothing (sidebar, no tab bar)",
  sheetBottomOffset({ width: 900, height: 700 }, false) === 0,
);
record(
  "sheet peek exactly at 768 reserves nothing (md boundary is exclusive)",
  sheetBottomOffset({ width: MOBILE_BREAKPOINT, height: 1024 }, false) === 0,
);

// keyboardBottomOffset: lift the sheet to the visual viewport's bottom when a
// keyboard shrinks it; clamp at 0 when the visual viewport is full (no keyboard).
record(
  "keyboard offset lifts the sheet by the hidden strip",
  keyboardBottomOffset(800, 500, 0) === 300,
  `got ${keyboardBottomOffset(800, 500, 0)}`,
);
record(
  "keyboard offset accounts for a visual-viewport top offset",
  keyboardBottomOffset(800, 500, 40) === 260,
  `got ${keyboardBottomOffset(800, 500, 40)}`,
);
record(
  "keyboard offset is 0 when the visual viewport fills the layout viewport",
  keyboardBottomOffset(800, 800, 0) === 0,
);
record(
  "keyboard offset never goes negative (larger visual viewport clamps to 0)",
  keyboardBottomOffset(800, 900, 0) === 0,
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
