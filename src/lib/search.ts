import surahIndex from "@/data/content/surah-index.json";
import learningPath from "@/data/content/learning-path.json";
import noonData from "@/data/content/noon-sakinah-tanween.json";
import meemData from "@/data/content/meem-sakinah.json";
import ghunnahData from "@/data/content/ghunnah.json";
import qalqalahData from "@/data/content/qalqalah.json";
import maddData from "@/data/content/madd-rules.json";
import laamRaaData from "@/data/content/laam-raa-rules.json";
import tafkheemData from "@/data/content/tafkheem-tarqeeq.json";
import waqfData from "@/data/content/waqf-symbols.json";
import makharijData from "@/data/content/makharij.json";
import type { LearningModule, SurahHeader } from "./types";

export type SearchResultKind = "surah" | "module" | "rule" | "letter" | "waqf-symbol";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  href: string;
  title: { en: string; ar: string };
  subtitle?: { en: string; ar?: string };
  // Body text used by the matcher; not necessarily shown.
  haystack: string;
}

interface RuleLike {
  id: string;
  title_en: string;
  title_ar: string;
  description?: string;
  description_ar?: string;
}

const surahs = surahIndex as SurahHeader[];
const modules = learningPath.modules as LearningModule[];

function pushRule(out: SearchResult[], moduleId: string, rule: RuleLike): void {
  out.push({
    id: `${moduleId}#${rule.id}`,
    kind: "rule",
    href: `/learn/${moduleId}#${rule.id}`,
    title: { en: rule.title_en, ar: rule.title_ar },
    subtitle: { en: rule.description ?? "", ar: rule.description_ar },
    haystack: [rule.id, rule.title_en, rule.title_ar, rule.description ?? "", rule.description_ar ?? ""]
      .join(" ")
      .toLowerCase(),
  });
}

let cachedIndex: SearchResult[] | null = null;

function getSearchIndex(): SearchResult[] {
  if (cachedIndex) return cachedIndex;
  const out: SearchResult[] = [];

  // Surahs.
  for (const s of surahs) {
    out.push({
      id: `surah-${s.number}`,
      kind: "surah",
      href: `/mushaf/surah/${s.number}`,
      title: { en: `${s.number}. ${s.nameSimple}`, ar: `${s.number}. ${s.nameArabic}` },
      subtitle: { en: `${s.versesCount} verses`, ar: `${s.versesCount} آية` },
      haystack: [s.number, s.nameSimple, s.nameArabic].join(" ").toLowerCase(),
    });
  }

  // Modules.
  for (const m of modules) {
    out.push({
      id: `module-${m.id}`,
      kind: "module",
      href: `/learn/${m.id}`,
      title: { en: m.title_en, ar: m.title_ar },
      subtitle: { en: m.description, ar: m.description_ar },
      haystack: [m.id, m.title_en, m.title_ar, m.description, m.description_ar ?? ""].join(" ").toLowerCase(),
    });
  }

  // Rules within each module.
  for (const r of noonData.rules) {
    pushRule(out, "noon-sakinah", r);
    if (r.subtypes) for (const st of r.subtypes) pushRule(out, "noon-sakinah", st as RuleLike);
  }
  for (const r of meemData.rules) pushRule(out, "meem-sakinah", r);
  for (const r of ghunnahData.rules) pushRule(out, "ghunnah", r);
  for (const r of qalqalahData.levels) pushRule(out, "qalqalah", r as RuleLike);
  for (const r of maddData.types) pushRule(out, "madd", r as RuleLike);
  for (const section of laamRaaData.sections) {
    pushRule(out, "laam-raa", section as RuleLike);
    if (section.subtypes) for (const st of section.subtypes) pushRule(out, "laam-raa", st as RuleLike);
  }

  // Tafkheem subsections.
  out.push({
    id: "tafkheem-tarqeeq#always-heavy",
    kind: "rule",
    href: "/learn/tafkheem-tarqeeq#always-heavy",
    title: { en: tafkheemData.always_heavy.title_en, ar: tafkheemData.always_heavy.title_ar },
    haystack: [tafkheemData.always_heavy.title_en, tafkheemData.always_heavy.title_ar].join(" ").toLowerCase(),
  });
  out.push({
    id: "tafkheem-tarqeeq#always-light",
    kind: "rule",
    href: "/learn/tafkheem-tarqeeq#always-light",
    title: { en: tafkheemData.always_light.title_en, ar: tafkheemData.always_light.title_ar },
    haystack: [tafkheemData.always_light.title_en, tafkheemData.always_light.title_ar, tafkheemData.always_light.description].join(" ").toLowerCase(),
  });
  out.push({
    id: "tafkheem-tarqeeq#variable-letters",
    kind: "rule",
    href: "/learn/tafkheem-tarqeeq#variable-letters",
    title: { en: tafkheemData.variable_letters.title_en, ar: tafkheemData.variable_letters.title_ar },
    haystack: [tafkheemData.variable_letters.title_en, tafkheemData.variable_letters.title_ar].join(" ").toLowerCase(),
  });

  // Waqf symbols (one entry per symbol).
  for (const sym of waqfData.symbols) {
    out.push({
      id: `waqf-${sym.id}`,
      kind: "waqf-symbol",
      href: `/learn/waqf#${sym.id}`,
      title: { en: sym.title_en, ar: sym.title_ar },
      subtitle: { en: sym.description, ar: sym.description_ar },
      haystack: [sym.id, sym.symbol, sym.title_en, sym.title_ar, sym.description, sym.description_ar ?? ""].join(" ").toLowerCase(),
    });
  }

  // Makharij regions, indexed under makharij-overview anchor since
  // per-region anchors aren't wrapped in the lesson page yet.
  for (const region of makharijData.regions) {
    out.push({
      id: `makharij-${region.id}`,
      kind: "rule",
      href: `/learn/makharij#makharij-overview`,
      title: { en: region.title_en, ar: region.title_ar },
      subtitle: { en: region.description, ar: region.description_ar },
      haystack: [region.id, region.title_en, region.title_ar, region.description, region.description_ar ?? ""].join(" ").toLowerCase(),
    });
  }

  cachedIndex = out;
  return out;
}

// Simple ranked search: tokenize the query, score by (a) match in title, (b)
// match in haystack, (c) consecutive token positions. No fuzzy matching, the
// content is small enough that exact-substring is fine.
export function search(query: string, limit = 20): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const index = getSearchIndex();
  const scored: { result: SearchResult; score: number }[] = [];

  for (const r of index) {
    const titleEn = r.title.en.toLowerCase();
    const titleAr = r.title.ar.toLowerCase();
    const titleHit = titleEn.includes(q) || titleAr.includes(q);
    const allTokensInTitle = tokens.every((tk) => titleEn.includes(tk) || titleAr.includes(tk));
    const allTokensInHaystack = tokens.every((tk) => r.haystack.includes(tk));

    let score = 0;
    if (titleHit) score += 50;
    if (allTokensInTitle) score += 25;
    if (allTokensInHaystack) score += 10;
    if (score === 0) continue;
    scored.push({ result: r, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.result);
}
