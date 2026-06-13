"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { getModuleMastery, type MasteryLevel } from "@/lib/mastery";
import { MODULES } from "@/components/layout/nav-data";
import { toArabicIndic } from "@/lib/utils";

// Badge tone per level, from the app's own tokens (no new colors).
const LEVEL_TONE: Record<MasteryLevel, string> = {
  untouched: "bg-bg-subtle text-text-muted dark:bg-bg-subtle-dark",
  started: "bg-gold-light/25 text-gold-dark dark:bg-gold-dark/25 dark:text-gold-light",
  practiced: "bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light",
  strong: "bg-accent/15 text-accent",
};

// Per-module mastery section for the progress page. Derived purely from saved
// progress via getModuleMastery; the question -> module map is loaded after
// mount so the question pool stays off the progress route's initial JS.
export function MasterySection() {
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
    const today = new Date().toISOString().slice(0, 10);
    return getModuleMastery(progress, map, moduleIds, today);
  }, [mounted, map, progress, moduleIds]);

  // SSR and first paint render nothing (mastery is localStorage-driven), in
  // step with the other progress cards.
  if (!mounted) return null;

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));
  const moduleName = (id: string) => {
    const mod = MODULES.find((m) => m.id === id);
    return mod ? (isAr ? mod.labelAr : mod.label) : id;
  };
  const anyActivity = rows.some((r) => r.level !== "untouched");

  return (
    <div>
      <h2 className="font-heading font-semibold mb-3">{t("mastery.title")}</h2>
      {!anyActivity ? (
        <Card>
          <p className="text-sm text-text-muted">{t("mastery.empty")}</p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.moduleId}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-gold-light/30 dark:border-gold-dark/20 last:border-0"
              >
                <span className="text-sm font-medium truncate min-w-0 flex-1">{moduleName(r.moduleId)}</span>
                <div className="flex items-center gap-2 shrink-0 text-[11px] text-text-muted">
                  {r.bestScore !== null && (
                    <span>{t("mastery.best")} {num(r.bestScore)}%</span>
                  )}
                  {r.mastered > 0 && <span>{num(r.mastered)} {t("mastery.mastered")}</span>}
                  {r.due > 0 && <span className="text-accent">{num(r.due)} {t("mastery.due")}</span>}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${LEVEL_TONE[r.level]}`}>
                    {t(`mastery.level.${r.level}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3">{t("mastery.help")}</p>
        </Card>
      )}
    </div>
  );
}
