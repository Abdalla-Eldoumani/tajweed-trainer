"use client";

import { getUniqueColors } from "@/lib/tajweed-colors";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n";

export function ColorLegend() {
  const colors = getUniqueColors();
  const { t, isAr } = useTranslation();

  return (
    <Card variant="ornate">
      <h3 className="font-heading font-semibold text-sm mb-3">{t("common.colorLegend")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list" aria-label={t("common.colorLegend")}>
        {colors.map((c) => (
          <div key={c.cssClass} className="flex items-center gap-2 min-w-0" role="listitem">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: c.hex }}
              aria-hidden="true"
            />
            <span className="text-xs truncate">
              {isAr ? c.nameAr : c.nameEn}
            </span>
            {!isAr && (
              <span className="text-xs text-text-muted font-arabic shrink-0" dir="rtl" lang="ar">
                {c.nameAr}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
