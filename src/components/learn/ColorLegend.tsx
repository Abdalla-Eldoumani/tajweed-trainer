"use client";

import {
  getColorsByGroup,
  TAJWEED_GROUP_ORDER,
  type TajweedColor,
  type TajweedGroup,
} from "@/lib/tajweed-colors";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n";

// Groups shown in the legend, in order. tafkheem is omitted: the API does not
// emit it, so it never appears as a colored letter in a verse.
const GROUP_LABEL: Partial<Record<TajweedGroup, string>> = {
  "ghunnah-idgham": "legend.group.ghunnahIdgham",
  madd: "legend.group.madd",
  qalqalah: "legend.group.qalqalah",
  "ikhfa-iqlab": "legend.group.ikhfaIqlab",
  "silent-laam": "legend.group.silentLaam",
};

// One cell per distinct color within a group (first rule of each color wins),
// matching the verses: rules that share a color are a single entry.
function dedupeByColor(colors: TajweedColor[]): TajweedColor[] {
  const seen = new Set<string>();
  return colors.filter((c) => {
    if (seen.has(c.hex)) return false;
    seen.add(c.hex);
    return true;
  });
}

// One legend cell: a small card whose specimen is the rule's own Arabic name,
// set in the rule's actual color (read from the map via the CSS variable, never
// hard-coded), with the English name as the label below. The specimen tile
// carries a gold hairline so the light grays stay visible on a white card.
function LegendCell({ color }: { color: TajweedColor }) {
  const swatch = `var(--tajweed-${color.cssClass})`;
  return (
    <li
      className="flex items-center gap-3 rounded-lg border bg-bg-card px-3 py-2 min-w-0 dark:bg-bg-card-dark"
      style={{ borderColor: "var(--gold-hairline)" }}
      role="listitem"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
        style={{ borderColor: "var(--gold-hairline)" }}
      >
        <span
          className="font-arabic text-lg leading-none"
          dir="rtl"
          lang="ar"
          style={{ color: swatch }}
        >
          {color.nameAr}
        </span>
      </span>
      <span className="font-heading text-sm font-medium min-w-0 flex-1 truncate">
        {color.nameEn}
      </span>
    </li>
  );
}

export function ColorLegend() {
  const { t } = useTranslation();
  const byGroup = getColorsByGroup();
  const groups = TAJWEED_GROUP_ORDER.filter((g) => GROUP_LABEL[g] && byGroup[g].length > 0);

  return (
    <Card variant="ornate">
      <h3 className="font-heading font-semibold text-sm mb-4">{t("common.colorLegend")}</h3>
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group} aria-label={t(GROUP_LABEL[group]!)}>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              {t(GROUP_LABEL[group]!)}
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" role="list">
              {dedupeByColor(byGroup[group]).map((c) => (
                <LegendCell key={c.cssClass} color={c} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}
