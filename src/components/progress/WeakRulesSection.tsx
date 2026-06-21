"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { getMissedByModule } from "@/lib/weak-rules";
import { MODULES } from "@/components/layout/nav-data";
import { toArabicIndic } from "@/lib/utils";

// Today as a local YYYY-MM-DD, matching the streak/khatmah convention. The
// weak-rules metric is history-based so the value is unused inside the lib, but
// it is passed for signature parity (mirrors MasterySection's `today`).
function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

// How many areas to surface; enough to act on, not a wall of rows.
const TOP_N = 5;

// The user's own most-missed rule AREAS (the nine modules), each linking to its
// targeted practice. This is honest per-module framing, NOT invented per-rule
// data: the lib attributes misses to a module (a tajweed rule family) and never
// holds a display name; the names here come from verified nav-data. Derived
// purely from saved progress; the question -> module map loads after mount so the
// question pool stays off the progress route's initial JS (mirrors
// MasterySection). Gated on `mounted` so it never flashes before hydration.
export function WeakRulesSection() {
  const { t, isAr } = useTranslation();
  const { progress } = useProgress();

  const [mounted, setMounted] = useState(false);
  const [map, setMap] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    setMounted(true);
    import("@/lib/question-pool").then((m) => setMap(m.getQuestionModuleMap()));
  }, []);

  const moduleIds = useMemo(() => MODULES.map((m) => m.id), []);
  const rows = useMemo(() => {
    if (!mounted || !map) return [];
    return getMissedByModule(progress, map, moduleIds, todayIso())
      .filter((r) => r.missed > 0)
      .slice(0, TOP_N);
  }, [mounted, map, progress, moduleIds]);

  // SSR and the first client paint render nothing (this is localStorage-driven),
  // in step with the other progress cards.
  if (!mounted) return null;

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));
  const moduleName = (id: string) => {
    const mod = MODULES.find((m) => m.id === id);
    return mod ? (isAr ? mod.labelAr : mod.label) : id;
  };

  return (
    <div>
      <h2 className="font-heading font-semibold mb-1">{t("weakRules.title")}</h2>
      <p className="text-xs text-text-muted mb-3">{t("weakRules.subtitle")}</p>
      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">{t("weakRules.empty")}</p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.moduleId}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-gold-light/30 dark:border-gold-dark/20 last:border-0"
              >
                <span className="text-sm font-medium truncate min-w-0 flex-1">
                  {moduleName(r.moduleId)}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-accent tabular-nums">
                    {t("weakRules.missedLabel").replace("{n}", num(r.missed))}
                  </span>
                  <Link
                    href={`/practice/${r.moduleId}`}
                    className="inline-flex items-center justify-center min-h-[44px] px-3 text-xs font-medium text-primary dark:text-primary-light hover:underline"
                  >
                    {t("weakRules.review")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
