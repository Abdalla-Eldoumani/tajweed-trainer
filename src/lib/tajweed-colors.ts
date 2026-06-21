// Tajweed color map: the single source of truth for the app's tajweed palette.
//
// Light values are transcribed verbatim from the Quranic Universal Library
// (QUL), the data project shared by Quran.com and Tarteel:
//   new / mushaf scheme: app/assets/stylesheets/shared/tajweed_color_new.scss
//   classic scheme:      app/assets/stylesheets/shared/tajweed.scss
// Light hexes are never invented or adjusted here. Dark values are lifts for the
// deep-navy dark background (not from QUL); scripts/verify-tajweed-colors.mjs
// contrast-checks them and enforces parity with the --tajweed-* variables in
// src/app/globals.css. This map is the single source of truth: do not hand-edit
// a hex in globals.css, change it here and the verify script keeps both in sync.
//
// Keys are the EXACT class names the Quran.com API emits in the
// text_uthmani_tajweed field. Live enumeration on 2026-05-30 (surahs 38, 2,
// 114 via api.quran.com/api/v4) returned these distinct classes:
//   ghunnah, ham_wasl, idgham_ghunnah, idgham_mutajanisayn, idgham_shafawi,
//   idgham_wo_ghunnah, ikhafa, ikhafa_shafawi, iqlab, laam_shamsiyah,
//   madda_necessary, madda_normal, madda_obligatory, madda_permissible,
//   qalaqah, slnt
// All sixteen are mapped below. idgham_mutaqaribayn, the madda_obligatory_*
// variants, and tafkheem were not in the sample but are kept (QUL lists them;
// the first two can appear in other surahs, tafkheem is generally not emitted).
// izhar / izhar_shafawi are not emitted and stay default ink by design.

export type TajweedScheme = "new" | "classic";

// The active palette. Flip to "classic" to switch the whole scheme from one
// place (the two schemes differ only in the madd family and qalaqah). Default
// is "new", confirmed by pixel-sampling the reference mushaf. The classic-scheme
// hexes are kept in the `classic` field of each entry below.
export const SCHEME: TajweedScheme = "new";

export type TajweedGroup =
  | "ghunnah-idgham"
  | "madd"
  | "qalqalah"
  | "ikhfa-iqlab"
  | "silent-laam"
  | "tafkheem";

interface SchemeColors {
  light: string;
  dark: string;
}

interface TajweedClassDef {
  nameEn: string;
  nameAr: string;
  group: TajweedGroup;
  new: SchemeColors;
  classic: SchemeColors;
}

// Keyed by exact API class name. Light values verbatim from QUL; dark values
// are contrast-checked lifts. Classic light values for the madd family and
// qalaqah come from the classic QUL sheet; their dark lifts are authored here
// so a flip to classic is not a broken dark mode. Every other color is identical
// between the two schemes.
const TAJWEED_DEFS: Record<string, TajweedClassDef> = {
  ham_wasl: {
    nameEn: "Hamzat al-Wasl",
    nameAr: "همزة الوصل",
    group: "silent-laam",
    new: { light: "#AAAAAA", dark: "#B7BCC6" },
    classic: { light: "#AAAAAA", dark: "#B7BCC6" },
  },
  slnt: {
    nameEn: "Silent",
    nameAr: "حرف لا يُنطق",
    group: "silent-laam",
    new: { light: "#AAAAAA", dark: "#B7BCC6" },
    classic: { light: "#AAAAAA", dark: "#B7BCC6" },
  },
  laam_shamsiyah: {
    nameEn: "Laam Shamsiyyah",
    nameAr: "لام شمسية",
    group: "silent-laam",
    new: { light: "#AAAAAA", dark: "#B7BCC6" },
    classic: { light: "#AAAAAA", dark: "#B7BCC6" },
  },
  idgham_mutajanisayn: {
    nameEn: "Idgham Mutajanisayn",
    nameAr: "إدغام متجانسين",
    group: "ghunnah-idgham",
    new: { light: "#A1A1A1", dark: "#B0B0B0" },
    classic: { light: "#A1A1A1", dark: "#B0B0B0" },
  },
  idgham_mutaqaribayn: {
    nameEn: "Idgham Mutaqaribayn",
    nameAr: "إدغام متقاربين",
    group: "ghunnah-idgham",
    new: { light: "#A1A1A1", dark: "#B0B0B0" },
    classic: { light: "#A1A1A1", dark: "#B0B0B0" },
  },
  ghunnah: {
    nameEn: "Ghunnah",
    nameAr: "غُنّة",
    group: "ghunnah-idgham",
    new: { light: "#FF7E1E", dark: "#FF8C36" },
    classic: { light: "#FF7E1E", dark: "#FF8C36" },
  },
  madda_normal: {
    nameEn: "Madd (natural, 2)",
    nameAr: "مدّ طبيعي",
    group: "madd",
    new: { light: "#537FFF", dark: "#6E92FF" },
    classic: { light: "#537FFF", dark: "#6E92FF" },
  },
  madda_permissible: {
    nameEn: "Madd (permissible)",
    nameAr: "مدّ جائز",
    group: "madd",
    new: { light: "#F38E02", dark: "#FBA53A" },
    classic: { light: "#4050FF", dark: "#8AA6FF" },
  },
  madda_necessary: {
    nameEn: "Madd (necessary, laazim)",
    nameAr: "مدّ لازم",
    group: "madd",
    new: { light: "#A9045C", dark: "#E0529A" },
    classic: { light: "#000EBC", dark: "#6E7CFF" },
  },
  madda_obligatory: {
    nameEn: "Madd (obligatory)",
    nameAr: "مدّ واجب متصل",
    group: "madd",
    new: { light: "#F2007F", dark: "#FF4DA6" },
    classic: { light: "#2144C1", dark: "#5E84FF" },
  },
  madda_obligatory_mottasel: {
    nameEn: "Madd (obligatory, muttasil)",
    nameAr: "مدّ واجب متصل",
    group: "madd",
    new: { light: "#F2007F", dark: "#FF4DA6" },
    classic: { light: "#2144C1", dark: "#5E84FF" },
  },
  madda_obligatory_monfasel: {
    nameEn: "Madd (obligatory, munfasil)",
    nameAr: "مدّ جائز منفصل",
    group: "madd",
    new: { light: "#F2007F", dark: "#FF4DA6" },
    classic: { light: "#2144C1", dark: "#5E84FF" },
  },
  qalaqah: {
    nameEn: "Qalqalah",
    nameAr: "قلقلة",
    group: "qalqalah",
    new: { light: "#009EE6", dark: "#38B6F5" },
    classic: { light: "#DD0008", dark: "#F45B5B" },
  },
  ikhafa: {
    nameEn: "Ikhfa",
    nameAr: "إخفاء",
    group: "ikhfa-iqlab",
    new: { light: "#9400A8", dark: "#C95BDC" },
    classic: { light: "#9400A8", dark: "#C95BDC" },
  },
  ikhafa_shafawi: {
    nameEn: "Ikhfa Shafawi",
    nameAr: "إخفاء شفوي",
    group: "ikhfa-iqlab",
    new: { light: "#D500B7", dark: "#F45AD8" },
    classic: { light: "#D500B7", dark: "#F45AD8" },
  },
  iqlab: {
    nameEn: "Iqlab",
    nameAr: "إقلاب",
    group: "ikhfa-iqlab",
    new: { light: "#26BFFD", dark: "#5BD0FF" },
    classic: { light: "#26BFFD", dark: "#5BD0FF" },
  },
  idgham_shafawi: {
    nameEn: "Idgham Shafawi",
    nameAr: "إدغام شفوي",
    group: "ghunnah-idgham",
    new: { light: "#58B800", dark: "#7FD63A" },
    classic: { light: "#58B800", dark: "#7FD63A" },
  },
  idgham_ghunnah: {
    nameEn: "Idgham with Ghunnah",
    nameAr: "إدغام بغنة",
    group: "ghunnah-idgham",
    new: { light: "#169200", dark: "#38C21F" },
    classic: { light: "#169200", dark: "#38C21F" },
  },
  idgham_wo_ghunnah: {
    nameEn: "Idgham without Ghunnah",
    nameAr: "إدغام بلا غنة",
    group: "ghunnah-idgham",
    new: { light: "#169200", dark: "#38C21F" },
    classic: { light: "#169200", dark: "#38C21F" },
  },
  tafkheem: {
    nameEn: "Tafkheem",
    nameAr: "تفخيم",
    group: "tafkheem",
    new: { light: "#006994", dark: "#3FA6C9" },
    classic: { light: "#006994", dark: "#3FA6C9" },
  },
};

export interface TajweedColor {
  cssClass: string;
  light: string;
  dark: string;
  nameEn: string;
  nameAr: string;
  group: TajweedGroup;
  // Back-compat with the pre-rebuild shape (hex = active-scheme light, hexDark =
  // active-scheme dark). Kept so ColorLegend keeps working until its rebuild.
  hex: string;
  hexDark: string;
}

function resolve(cssClass: string, def: TajweedClassDef): TajweedColor {
  const { light, dark } = def[SCHEME];
  return {
    cssClass,
    light,
    dark,
    nameEn: def.nameEn,
    nameAr: def.nameAr,
    group: def.group,
    hex: light,
    hexDark: dark,
  };
}

// Every class resolved to the active scheme, in declaration order.
export const TAJWEED_COLORS: TajweedColor[] = Object.entries(TAJWEED_DEFS).map(
  ([cssClass, def]) => resolve(cssClass, def),
);

// Old class names the app used before the rebuild. A caller passing a legacy
// name still resolves to the right color; the CSS keeps matching aliases too.
const CLASS_ALIASES: Record<string, string> = {
  ikhfaa: "ikhafa",
  ikhfaa_shafawi: "ikhafa_shafawi",
  idgham_no_ghunnah: "idgham_wo_ghunnah",
  qalqalah: "qalaqah",
  silent: "slnt",
};

export function getColorForClass(cssClass: string): TajweedColor | undefined {
  const key = CLASS_ALIASES[cssClass] ?? cssClass;
  const def = TAJWEED_DEFS[key];
  return def ? resolve(key, def) : undefined;
}

// Unique by color (light hex), so the legend shows one row per distinct color
// rather than one per class. Matches the pre-rebuild behavior.
export function getUniqueColors(): TajweedColor[] {
  const seen = new Set<string>();
  return TAJWEED_COLORS.filter((c) => {
    if (seen.has(c.hex)) return false;
    seen.add(c.hex);
    return true;
  });
}

export const TAJWEED_GROUP_ORDER: TajweedGroup[] = [
  "ghunnah-idgham",
  "madd",
  "qalqalah",
  "ikhfa-iqlab",
  "silent-laam",
  "tafkheem",
];

export function getColorsByGroup(): Record<TajweedGroup, TajweedColor[]> {
  const out: Record<TajweedGroup, TajweedColor[]> = {
    "ghunnah-idgham": [],
    madd: [],
    qalqalah: [],
    "ikhfa-iqlab": [],
    "silent-laam": [],
    tafkheem: [],
  };
  for (const c of TAJWEED_COLORS) out[c.group].push(c);
  return out;
}

// The five theme grounds. vellum and night are the shipped light/dark palettes;
// pearl is a cooler light, sepia a warm dim dark, mihrab an emerald dark.
export type ThemeName = "vellum" | "pearl" | "night" | "sepia" | "mihrab";

export const THEME_NAMES: readonly ThemeName[] = [
  "vellum",
  "pearl",
  "night",
  "sepia",
  "mihrab",
] as const;

// Per-theme rendered value for every tajweed class, keyed by the exact API class
// name. These are retuned-per-ground renderings of the SAME verified reference
// hues (.agent/TAJWEED_COLOR_REFERENCE.md): each rule keeps its conceptual hue
// in every theme; only lightness/saturation move so the color stays legible on
// that theme's ground. No rule is reclassified, no color is invented, and no two
// rules collide on any ground. Derivation:
//   - vellum reuses the active-scheme `light` value verbatim (the shipped warm
//     light ground); night reuses the active-scheme `dark` lift verbatim (the
//     shipped navy ground). Those two are fixed and must not drift.
//   - pearl deepens each hue for the cooler, brighter light ground so it clears
//     contrast there (the lighter ground washes out the verbatim light values).
//   - sepia and mihrab brighten/warm each hue for those dark grounds.
// The recessive grays (ham_wasl, slnt, laam_shamsiyah, idgham_mutajanisayn,
// idgham_mutaqaribayn) stay neutral and recessive on every ground by design;
// their cue is the legend's hairline swatch, not contrast.
// src/app/globals.css mirrors this map under each [data-theme] block (a manual
// mirror, like the :root/.dark mirror); scripts/verify-tajweed-colors.mjs keeps
// the :root/.dark parity green and Plan 07 adds the per-ground completeness and
// contrast gate that reads this structure.
export const THEME_TAJWEED: Record<string, Record<ThemeName, string>> = {
  ham_wasl: { vellum: "#AAAAAA", pearl: "#949494", night: "#B7BCC6", sepia: "#B3AEA2", mihrab: "#A8B0A6" },
  slnt: { vellum: "#AAAAAA", pearl: "#949494", night: "#B7BCC6", sepia: "#B3AEA2", mihrab: "#A8B0A6" },
  laam_shamsiyah: { vellum: "#AAAAAA", pearl: "#949494", night: "#B7BCC6", sepia: "#B3AEA2", mihrab: "#A8B0A6" },
  idgham_mutajanisayn: { vellum: "#A1A1A1", pearl: "#8C8C8C", night: "#B0B0B0", sepia: "#ABA69A", mihrab: "#A0A89E" },
  idgham_mutaqaribayn: { vellum: "#A1A1A1", pearl: "#8C8C8C", night: "#B0B0B0", sepia: "#ABA69A", mihrab: "#A0A89E" },
  ghunnah: { vellum: "#FF7E1E", pearl: "#E56200", night: "#FF8C36", sepia: "#FF9442", mihrab: "#FF9038" },
  madda_normal: { vellum: "#537FFF", pearl: "#3A6BFF", night: "#6E92FF", sepia: "#7E9DFF", mihrab: "#7896FF" },
  madda_permissible: { vellum: "#F38E02", pearl: "#C97500", night: "#FBA53A", sepia: "#FFB04A", mihrab: "#FCAB42" },
  madda_necessary: { vellum: "#A9045C", pearl: "#A9045C", night: "#E0529A", sepia: "#EA6AAA", mihrab: "#E85FA2" },
  madda_obligatory: { vellum: "#F2007F", pearl: "#D6006F", night: "#FF4DA6", sepia: "#FF63B0", mihrab: "#FF5AAB" },
  madda_obligatory_mottasel: { vellum: "#F2007F", pearl: "#D6006F", night: "#FF4DA6", sepia: "#FF63B0", mihrab: "#FF5AAB" },
  madda_obligatory_monfasel: { vellum: "#F2007F", pearl: "#D6006F", night: "#FF4DA6", sepia: "#FF63B0", mihrab: "#FF5AAB" },
  qalaqah: { vellum: "#009EE6", pearl: "#0090D2", night: "#38B6F5", sepia: "#4FC0F7", mihrab: "#45BBF6" },
  ikhafa: { vellum: "#9400A8", pearl: "#9400A8", night: "#C95BDC", sepia: "#D26FE2", mihrab: "#CF66DF" },
  ikhafa_shafawi: { vellum: "#D500B7", pearl: "#BC00A1", night: "#F45AD8", sepia: "#F86FDE", mihrab: "#F766DC" },
  iqlab: { vellum: "#26BFFD", pearl: "#0A78A8", night: "#5BD0FF", sepia: "#72D7FF", mihrab: "#68D4FF" },
  idgham_shafawi: { vellum: "#58B800", pearl: "#4A9C00", night: "#7FD63A", sepia: "#90DB55", mihrab: "#88D94D" },
  idgham_ghunnah: { vellum: "#169200", pearl: "#169200", night: "#38C21F", sepia: "#4ACC34", mihrab: "#43C92D" },
  idgham_wo_ghunnah: { vellum: "#169200", pearl: "#169200", night: "#38C21F", sepia: "#4ACC34", mihrab: "#43C92D" },
  tafkheem: { vellum: "#006994", pearl: "#006994", night: "#3FA6C9", sepia: "#54B2D2", mihrab: "#4BADCE" },
};

// Resolve one class to its rendered value on a given theme. Resolves legacy
// aliases the same way getColorForClass does; returns undefined for an unknown
// class so a caller can fall back to default ink.
export function getThemeColorForClass(
  cssClass: string,
  theme: ThemeName,
): string | undefined {
  const key = CLASS_ALIASES[cssClass] ?? cssClass;
  return THEME_TAJWEED[key]?.[theme];
}
