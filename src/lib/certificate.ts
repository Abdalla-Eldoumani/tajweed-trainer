// Milestone certificate: the pure completion detection and the canvas render.
//
// Two halves, kept separable on purpose:
//   1. PURE completion math (getCompletedJuz, isKhatmahComplete). Imports only
//      memorization-scope and khatmah (and types). No DOM, no canvas, no React,
//      so the same functions the component calls are exercised by the offline
//      verify script's re-derivation. A juz is complete when every one of its
//      verses is memorized; khatmah completeness is computeKhatmahPace's own
//      isComplete, passed through so there is no second pace model here.
//   2. CANVAS render/export (drawCertificate, certificateToBlob). The only part
//      that touches CanvasRenderingContext2D / HTMLCanvasElement. Those are
//      ambient DOM lib types (no runtime import), and the pure functions call no
//      DOM API, so importing the pure half never pulls the DOM in at runtime.
//
// CONST-01: the certificate draws operational achievement copy only (the
// milestone, the date, the app name) and a procedural ornament. It NEVER draws
// Quranic text, and this lib holds no display strings: the component passes the
// already-localized lines in. The ornament is re-derived trig (the 12-point star
// from Ornament.tsx), not the SVG component and not traced Mushaf art.
// EDGE_CASES_V2 line 50: the image blob is rendered and downloaded on-device and
// is NEVER persisted; only a small completion record is stored (see storage.ts).

import { countInScope, versesForJuz } from "./memorization-scope";
import { computeKhatmahPace } from "./khatmah";
import type { KhatmahPlan } from "./types";

// ---------------------------------------------------------------------------
// Pure completion detection (Node-importable, no DOM)
// ---------------------------------------------------------------------------

// The juz numbers (1..30) the learner has fully memorized: every verse of the
// juz is in the memorized set. Empty when none are complete. Uses the same
// scope enumeration the tracker uses (versesForJuz) and the same intersection
// count (countInScope), so a juz counts as done only when the intersection
// covers the whole juz, and the last-juz boundary is handled by versesForJuz.
export function getCompletedJuz(memorized: Set<string>): number[] {
  const out: number[] = [];
  for (let juz = 1; juz <= 30; juz++) {
    const scope = versesForJuz(juz);
    if (countInScope(memorized, scope) === scope.length) out.push(juz);
  }
  return out;
}

// A thin pass-through to the pace lib's own completion flag, so the component and
// the verify script share one definition of "khatmah complete" (the reader has
// reached the final mushaf page) and there is no second pace model to drift.
export function isKhatmahComplete(
  plan: KhatmahPlan,
  currentPage: number,
  today: string,
): boolean {
  return computeKhatmahPace(plan, currentPage, today).isComplete;
}

// What the canvas needs to render. The human-readable strings are passed IN by
// the component from i18n (this lib holds no display copy; CONST-01). `ref` is
// the juz number for a juz certificate, null for a khatmah. `dir` lets the canvas
// align/lay out Arabic right-to-left without this lib knowing the language.
export interface CertificateData {
  kind: "juz" | "khatmah";
  ref: number | null;
  dateIso: string;
  dir: "ltr" | "rtl";
  lines: {
    // Small eyebrow above the title, e.g. "Certificate of completion".
    eyebrow: string;
    // The milestone headline, e.g. "Juz 30" or "The whole Quran".
    title: string;
    // A short achievement line, e.g. "memorized" / "read in full".
    subtitle: string;
    // The labelled date line, already formatted (label + localized date).
    date: string;
    // The app name, drawn small at the foot as the issuing source.
    app: string;
  };
}

// ---------------------------------------------------------------------------
// Canvas render + export (browser-only; the pure functions above call none of
// this, so they stay Node-safe)
// ---------------------------------------------------------------------------

// The manuscript palette, kept local so the lib has no styling dependency. Gold
// is the design ornament gold (#D4A843); the ground is a warm vellum and the ink
// a deep navy, matching the app's light anchors.
const GOLD = "#D4A843";
const GROUND = "#FCFAF3";
const INK = "#131B2E";
const INK_MUTED = "#555F77";

// Re-derive the medallion as canvas path calls: three concentric rings and the
// 12-point star from Ornament.tsx (for i in 0..11: a = i*30deg; a spoke from r1
// to r2). Full-precision trig here — the rounding in the SVG only existed to keep
// server and client markup byte-identical for hydration, which canvas never has.
// `r` is the outer ring radius; the inner geometry scales from it (the SVG used
// 90/65/40 rings and a 25..80 star inside a 100-radius frame).
function drawMedallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const ring = (radius: number, width: number, alpha: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
  };

  ctx.save();
  ring(r, Math.max(1, r * 0.012), 0.5);
  ring(r * 0.72, Math.max(1, r * 0.009), 0.6);
  ring(r * 0.44, Math.max(1, r * 0.009), 0.7);

  // The 12-point star: spokes from 0.28r to 0.89r (the SVG's 25..80 of 100).
  const r1 = r * 0.28;
  const r2 = r * 0.89;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(0.75, r * 0.008);
  ctx.strokeStyle = GOLD;
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

// Paint a manuscript-style certificate onto a 2D context: a vellum ground, a
// gold double-hairline frame, a procedural medallion, and the operational text
// lines centered. RTL is honored via the data's `dir` (the strings are already
// localized by the caller). Nothing here is Quranic text.
export function drawCertificate(
  ctx: CanvasRenderingContext2D,
  data: CertificateData,
  size: { w: number; h: number },
): void {
  const { w, h } = size;
  const { lines, dir } = data;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // Ground.
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, w, h);

  // Gold double-hairline frame: an outer rectangle and a finer inner one.
  const pad = Math.round(Math.min(w, h) * 0.05);
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(2, w * 0.0035);
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, w * 0.0015);
  const inner = pad + Math.round(pad * 0.32);
  ctx.strokeRect(inner, inner, w - inner * 2, h - inner * 2);
  ctx.globalAlpha = 1;

  // Medallion, centered in the upper third.
  drawMedallion(ctx, w / 2, h * 0.3, Math.min(w, h) * 0.16);

  // Text block, all centered on the horizontal midline. `direction` mainly
  // affects how the centered runs shape; alignment stays center for symmetry.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.direction = dir;

  // Eyebrow.
  ctx.fillStyle = INK_MUTED;
  ctx.font = `500 ${Math.round(h * 0.028)}px Spectral, Georgia, serif`;
  ctx.fillText(lines.eyebrow, w / 2, h * 0.52);

  // Title (the milestone) — the large heading.
  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(h * 0.085)}px Spectral, Georgia, serif`;
  ctx.fillText(lines.title, w / 2, h * 0.63);

  // Subtitle (the achievement).
  ctx.fillStyle = INK_MUTED;
  ctx.font = `400 ${Math.round(h * 0.034)}px Spectral, Georgia, serif`;
  ctx.fillText(lines.subtitle, w / 2, h * 0.71);

  // Date line.
  ctx.fillStyle = INK;
  ctx.font = `400 ${Math.round(h * 0.03)}px Spectral, Georgia, serif`;
  ctx.fillText(lines.date, w / 2, h * 0.82);

  // App name, small at the foot as the issuing source.
  ctx.fillStyle = INK_MUTED;
  ctx.font = `500 ${Math.round(h * 0.024)}px Spectral, Georgia, serif`;
  ctx.fillText(lines.app, w / 2, h * 0.9);

  ctx.restore();
}

// Export the rendered canvas as a PNG blob, in memory. The caller turns this
// into an object URL, clicks a temporary download link, and revokes the URL;
// nothing is ever written to storage (EDGE_CASES_V2 line 50). Resolves null if
// the browser cannot produce a blob, which the caller surfaces quietly.
export function certificateToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
