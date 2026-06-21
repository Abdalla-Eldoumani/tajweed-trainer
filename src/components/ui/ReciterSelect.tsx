"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RECITATIONS, DEFAULT_RECITER_ID, getRecitation, styleGroup, type ReciterStyleGroup } from "@/lib/reciters";
import type { ReciterId, Recitation } from "@/lib/types";

// The reciter catalogue grouped into the two display styles (Mujawwad, then
// Murattal), so the dropdown reads the same way everywhere it is used. Derived
// once at module load from the static catalogue, never per render. The
// component narrows this by the live search query each render.
const RECITER_GROUPS: Array<{ key: ReciterStyleGroup; labelKey: string; list: Recitation[] }> = (() => {
  const out: Array<{ key: ReciterStyleGroup; labelKey: string; list: Recitation[] }> = [
    { key: "mujawwad", labelKey: "settings.reciterStyleMujawwad", list: [] },
    { key: "murattal", labelKey: "settings.reciterStyleMurattal", list: [] },
  ];
  for (const r of RECITATIONS) out.find((g) => g.key === styleGroup(r))?.list.push(r);
  return out.filter((g) => g.list.length > 0);
})();

// A grouped-by-style reciter dropdown driven by a value / onChange contract,
// with a search box above it so the ~42-reciter catalogue stays browsable. It is
// shared by the reading-depth reciter compare and the verse overlay's inline
// controls; the Settings reciter selector keeps its own copy of this search
// wiring. The component holds no persisted state and no storage — only the
// in-memory search query — so the caller still owns where the value lives
// (in-memory for compare, settings for the inline control). The selected id is
// always kept present as an option (both when filtered out by the query and when
// not in the known catalogue), so a controlled value is never lost.
export function ReciterSelect({
  value,
  onChange,
  label,
  className,
}: {
  value: ReciterId;
  onChange: (id: ReciterId) => void;
  label: string;
  className?: string;
}) {
  const { t, isAr } = useTranslation();
  const [query, setQuery] = useState("");
  const known = getRecitation(value);
  const reciterLabel = (r: Recitation): string => {
    const base = isAr ? r.nameAr : r.nameEn;
    const styled = r.style ? `${base}, ${r.style}` : base;
    return r.id === DEFAULT_RECITER_ID ? `${styled} (${t("settings.recitersDefault")})` : styled;
  };

  // Narrow the catalogue by the query against the English or Arabic name or
  // style, keeping the selected reciter present so the control never loses its
  // value while filtering. Mirrors the Settings selector's filter verbatim. An
  // empty query reuses the module-level RECITER_GROUPS (the full catalogue
  // grouped once) instead of rebuilding it.
  const view = useMemo(() => {
    const q = query.trim();
    if (q === "") return { groups: RECITER_GROUPS, noResults: false };
    const ql = q.toLowerCase();
    const matchesQuery = (r: Recitation) =>
      r.nameEn.toLowerCase().includes(ql) || r.nameAr.includes(q) || (r.style ?? "").toLowerCase().includes(ql);
    const queryHits = RECITATIONS.filter(matchesQuery);
    const visible = RECITATIONS.filter((r) => r.id === value || matchesQuery(r));
    const groups: Array<{ key: ReciterStyleGroup; labelKey: string; list: Recitation[] }> = [
      { key: "mujawwad", labelKey: "settings.reciterStyleMujawwad", list: [] },
      { key: "murattal", labelKey: "settings.reciterStyleMurattal", list: [] },
    ];
    for (const r of visible) groups.find((x) => x.key === styleGroup(r))?.list.push(r);
    return { groups: groups.filter((g) => g.list.length > 0), noResults: queryHits.length === 0 };
  }, [query, value]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("settings.reciterSearch")}
        aria-label={t("settings.reciterSearch")}
        className="w-full text-xs bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full text-xs bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]"
      >
        {!known && <option value={value}>{value}</option>}
        {view.groups.map((group) => (
          <optgroup key={group.key} label={t(group.labelKey)}>
            {group.list.map((r) => (
              <option key={r.id} value={r.id}>
                {reciterLabel(r)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {view.noResults && <p className="text-micro text-text-muted">{t("settings.reciterNoResults")}</p>}
    </div>
  );
}
