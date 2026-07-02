import { describe, it, expect } from "vitest";
import { TAJWEED_RULE_LINKS, getLessonLinkForClass } from "@/lib/tajweed-rule-links";
import { getColorForClass } from "@/lib/tajweed-colors";

// Ported map-parity from scripts/verify-study-tools.mjs and
// scripts/verify-rule-reveal.mjs (the map halves; the store/host/component
// wiring, gesture, and drill CSS stay as source-parity .mjs). This imports the
// REAL rule-link map and the REAL color resolver, so the popover can never ship
// a dead "Learn more" link: every rule-link class must resolve to a color and
// every route must be a /learn lesson route. This is structural navigation only
// — no hex, no rule prose, no content values are asserted here (the CSS-hex
// parity WARN-split audit stays in verify-tajweed-colors.mjs).

const linkEntries = Object.entries(TAJWEED_RULE_LINKS);

// Classes that span several modules or have no single home are deliberately
// absent from the map, so the popover shows the name and swatch with no link
// rather than sending the learner to a loosely related page.
const DELIBERATELY_ABSENT = [
  "idgham_mutajanisayn",
  "idgham_mutaqaribayn",
  "ham_wasl",
  "slnt",
];

describe("tajweed rule links — map parity with the color map", () => {
  it("the rule-link map has entries", () => {
    expect(linkEntries.length).toBeGreaterThan(0);
  });

  it("every rule-link class resolves to a color (no orphan / dead link)", () => {
    // The exact case verify-study-tools.mjs guarded: link classes are a subset
    // of the color-map keys, so a class that loses its color can never keep a
    // link.
    const orphans = linkEntries
      .map(([cssClass]) => cssClass)
      .filter((cssClass) => getColorForClass(cssClass) === undefined);
    expect(orphans, orphans.join(", ")).toEqual([]);
  });

  it("every route points at a /learn lesson", () => {
    const bad = linkEntries.filter(([, route]) => !route.startsWith("/learn/"));
    expect(bad.map(([cssClass, route]) => `${cssClass}:${route}`)).toEqual([]);
  });

  it("getLessonLinkForClass returns the mapped route for every link class", () => {
    for (const [cssClass, route] of linkEntries) {
      expect(getLessonLinkForClass(cssClass)).toBe(route);
    }
  });
});

describe("tajweed rule links — deliberately absent classes have no link", () => {
  it("the multi-home / no-single-owner classes return null", () => {
    for (const cssClass of DELIBERATELY_ABSENT) {
      expect(getLessonLinkForClass(cssClass), cssClass).toBeNull();
    }
  });

  it("an unknown class returns null", () => {
    expect(getLessonLinkForClass("not_a_tajweed_class")).toBeNull();
  });
});
