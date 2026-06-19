// Structural metadata only: maps each tajweed API CSS class to the learning
// module that teaches it. This is navigation wiring, NOT religious content. It
// holds no rule descriptions, classifications, or examples; the rule name and
// color come from tajweed-colors.ts (the verified map) and the actual lesson
// content lives in src/data/content. Adding a route here never adds knowledge.
//
// Keys are the exact class names the Quran.com API emits (mirrored in
// tajweed-colors.ts). A class maps to a module route only where the
// correspondence is unambiguous. Classes that span several modules or have no
// single home (idgham_mutajanisayn, idgham_mutaqaribayn, ham_wasl, slnt) are
// deliberately absent: the popover then shows the rule name and color with no
// "Learn more" link rather than sending the learner to a loosely related page.
//
// scripts/verify-study-tools.mjs asserts every key here exists in the tajweed
// map, so a typo or a class that loses its color can never ship a dead link.

const TAJWEED_RULE_LINKS: Record<string, string> = {
  // Ghunnah (the nasal sound) has its own module.
  ghunnah: "/learn/ghunnah",

  // Noon Sakinah & Tanween: idgham (both kinds), ikhfa, and iqlab.
  idgham_ghunnah: "/learn/noon-sakinah",
  idgham_wo_ghunnah: "/learn/noon-sakinah",
  ikhafa: "/learn/noon-sakinah",
  iqlab: "/learn/noon-sakinah",

  // Meem Sakinah: the shafawi (labial) rules.
  idgham_shafawi: "/learn/meem-sakinah",
  ikhafa_shafawi: "/learn/meem-sakinah",

  // Qalqalah (the echoing letters).
  qalaqah: "/learn/qalqalah",

  // Madd (elongation), every variant the API emits.
  madda_normal: "/learn/madd",
  madda_permissible: "/learn/madd",
  madda_necessary: "/learn/madd",
  madda_obligatory: "/learn/madd",
  madda_obligatory_mottasel: "/learn/madd",
  madda_obligatory_monfasel: "/learn/madd",

  // Laam rules (sun/moon letters) live in the Laam & Raa module.
  laam_shamsiyah: "/learn/laam-raa",

  // Tafkheem (heaviness) is taught in the Tafkheem & Tarqeeq module.
  tafkheem: "/learn/tafkheem-tarqeeq",
};

// The lesson route for a tajweed class, or null when no single module owns it.
export function getLessonLinkForClass(cssClass: string): string | null {
  return TAJWEED_RULE_LINKS[cssClass] ?? null;
}

// Read-only view of the map, for the verify script and any future consumer.
export function getRuleLinkClasses(): string[] {
  return Object.keys(TAJWEED_RULE_LINKS);
}
