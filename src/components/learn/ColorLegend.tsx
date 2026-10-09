"use client";

import {
  getColorsByGroup,
  TAJWEED_GROUP_ORDER,
  type TajweedColor,
  type TajweedGroup,
} from "@/lib/tajweed-colors";
import { SectionHeading } from "@/components/ui/SectionHeading";
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

// One legend entry: the rule's Arabic name set in its own color, read through
// the --tajweed-${cssClass} variable (theme-aware, never a hard-coded hex) so
// the legend cannot disagree with the same rule in a verse. The specimen sits on
// a bg-subtle chip with a gold hairline; without it the pale grays and light
// blues wash out on vellum.
function LegendEntry({ color }: { color: TajweedColor }) {
  return (
    <li className="flex items-center gap-2 min-w-0">
      <span
        className="shrink-0 rounded-md border bg-bg-subtle px-2 py-0.5 font-arabic text-base leading-normal whitespace-nowrap dark:bg-bg-subtle-dark"
        style={{ borderColor: "var(--gold-hairline)", color: `var(--tajweed-${color.cssClass})` }}
        dir="rtl"
        lang="ar"
      >
        {color.nameAr}
      </span>
      <span className="text-small truncate">{color.nameEn}</span>
    </li>
  );
}

export function ColorLegend() {
  const { t } = useTranslation();
  const byGroup = getColorsByGroup();
  const groups = TAJWEED_GROUP_ORDER.filter((g) => GROUP_LABEL[g] && byGroup[g].length > 0);

  return (
    <section aria-label={t("common.colorLegend")}>
      <SectionHeading as="h2" rule className="mb-4">
        {t("common.colorLegend")}
      </SectionHeading>
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group} aria-label={t(GROUP_LABEL[group]!)}>
            <h3 className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted mb-2">
              {t(GROUP_LABEL[group]!)}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2" role="list">
              {dedupeByColor(byGroup[group]).map((c) => (
                <LegendEntry key={c.cssClass} color={c} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
