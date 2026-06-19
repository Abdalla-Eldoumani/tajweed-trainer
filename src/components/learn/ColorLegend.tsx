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

// One legend cell: a small card holding a colored Arabic specimen plus the
// rule's English and Arabic names. The specimen is the rule set in its own
// color, read from the map through the --tajweed-${cssClass} CSS variable
// (theme-aware, never a hard-coded hex), so the legend can never disagree with
// the same rule rendered in a verse. The specimen chip carries a gold hairline
// so the pale grays and light blues stay visible on the vellum card; without it
// they wash out. The English name truncates so multi-word names never overflow.
function LegendCell({ color }: { color: TajweedColor }) {
  const swatch = `var(--tajweed-${color.cssClass})`;
  return (
    <li
      className="flex flex-col gap-2 rounded-lg border bg-bg-card px-3 py-2 min-w-0 dark:bg-bg-card-dark"
      style={{ borderColor: "var(--gold-hairline)" }}
      role="listitem"
    >
      <span
        className="inline-flex h-9 w-fit max-w-full items-center self-start rounded-md border px-2"
        style={{ borderColor: "var(--gold-hairline)" }}
      >
        <span
          className="font-arabic text-base leading-none whitespace-nowrap overflow-hidden text-ellipsis"
          dir="rtl"
          lang="ar"
          style={{ color: swatch }}
        >
          {color.nameAr}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-small font-medium truncate">
          {color.nameEn}
        </span>
        <span
          className="block font-arabic text-micro text-text-muted truncate"
          dir="rtl"
          lang="ar"
        >
          {color.nameAr}
        </span>
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
      <h3 className="font-heading text-small font-semibold mb-4">{t("common.colorLegend")}</h3>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group} aria-label={t(GROUP_LABEL[group]!)}>
            <h4 className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted mb-2">
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
