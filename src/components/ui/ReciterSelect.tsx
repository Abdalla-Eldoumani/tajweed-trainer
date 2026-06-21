"use client";

import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RECITATIONS, DEFAULT_RECITER_ID, getRecitation, styleGroup, type ReciterStyleGroup } from "@/lib/reciters";
import type { ReciterId, Recitation } from "@/lib/types";

// The reciter catalogue grouped into the two display styles (Mujawwad, then
// Murattal), so the dropdown reads the same way everywhere it is used. Derived
// once at module load from the static catalogue, never per render.
const RECITER_GROUPS: Array<{ key: ReciterStyleGroup; labelKey: string; list: Recitation[] }> = (() => {
  const out: Array<{ key: ReciterStyleGroup; labelKey: string; list: Recitation[] }> = [
    { key: "mujawwad", labelKey: "settings.reciterStyleMujawwad", list: [] },
    { key: "murattal", labelKey: "settings.reciterStyleMurattal", list: [] },
  ];
  for (const r of RECITATIONS) out.find((g) => g.key === styleGroup(r))?.list.push(r);
  return out.filter((g) => g.list.length > 0);
})();

// A grouped-by-style reciter dropdown driven by a value / onChange contract. It
// is the compact, no-search variant shared by the reading-depth reciter compare
// and the verse overlay's inline controls; the Settings reciter selector keeps
// its own search wiring. The component holds no state and no storage — it is a
// pure controlled select, so the caller owns where the value lives (in-memory
// for compare, settings for the inline control). The selected id is always kept
// present as an option so a controlled value is never lost, even if it is not in
// the known catalogue.
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
  const known = getRecitation(value);
  const reciterLabel = (r: Recitation): string => {
    const base = isAr ? r.nameAr : r.nameEn;
    const styled = r.style ? `${base}, ${r.style}` : base;
    return r.id === DEFAULT_RECITER_ID ? `${styled} (${t("settings.recitersDefault")})` : styled;
  };
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn(
        "w-full text-xs bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]",
        className,
      )}
    >
      {!known && <option value={value}>{value}</option>}
      {RECITER_GROUPS.map((group) => (
        <optgroup key={group.key} label={t(group.labelKey)}>
          {group.list.map((r) => (
            <option key={r.id} value={r.id}>
              {reciterLabel(r)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
