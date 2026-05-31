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
                <li
                  key={c.cssClass}
                  className="flex items-center gap-2.5 rounded-lg border px-3 py-2 min-w-0"
                  style={{ borderColor: "var(--border-ornate-subtle)" }}
                  role="listitem"
                >
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 rounded-full shrink-0 border"
                    style={{
                      backgroundColor: `var(--tajweed-${c.cssClass})`,
                      borderColor: "var(--border-ornate-subtle)",
                    }}
                  />
                  <span className="font-heading text-sm font-medium flex-1 min-w-0 truncate">
                    {c.nameEn}
                  </span>
                  <span
                    className="font-arabic text-base shrink-0"
                    dir="rtl"
                    lang="ar"
                    style={{ color: `var(--tajweed-${c.cssClass})` }}
                  >
                    {c.nameAr}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}
