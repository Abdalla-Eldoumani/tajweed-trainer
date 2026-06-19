"use client";

import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { LessonProgress } from "@/components/learn/LessonProgress";
import { LockedModuleScreen } from "@/components/learn/LockedModuleScreen";
import { useProgress } from "@/hooks/useProgress";
import { useModuleLock } from "@/hooks/useModuleLock";
import LearnLoading from "../loading";
import { useTranslation } from "@/lib/i18n";
import waqfData from "@/data/content/waqf-symbols.json";

const SECTIONS = [
  "waqf-overview",
  ...waqfData.symbols.map((s) => s.id),
  "stopping-effects",
];

export default function WaqfPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("waqf");
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("waqf");
  const { t, isAr } = useTranslation();

  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={waqfData.title_en}
        moduleTitleAr={waqfData.title_ar}
        prereqId={prereqId}
        prereqTitleEn={prereqTitleEn}
        prereqTitleAr={prereqTitleAr}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div id="waqf-overview" className="scroll-mt-20">
        <SectionBanner
          title={isAr ? waqfData.title_ar : waqfData.title_en}
          subtitle={isAr ? waqfData.title_en : waqfData.title_ar}
        />
        <p className="text-small text-text-muted mt-4">
          {isAr ? (waqfData.introduction_ar ?? waqfData.introduction) : waqfData.introduction}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {waqfData.symbols.map((symbol) => (
          <Card key={symbol.id} id={symbol.id} className="scroll-mt-20">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gold-light/20 dark:bg-gold-dark/20 border border-gold-light/30 dark:border-gold-dark/30 shrink-0">
                <ArabicText text={symbol.symbol} size="md" className="text-gold-dark dark:text-gold" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-small">{isAr ? symbol.title_ar : symbol.title_en}</h3>
                {!isAr && <ArabicText text={symbol.title_ar} size="sm" className="text-text-muted" />}
                <p className="text-micro text-text-muted mt-2">{isAr && symbol.description_ar ? symbol.description_ar : symbol.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card id="stopping-effects" className="scroll-mt-20">
        <h2 className="font-heading font-semibold text-h2 mb-3">{t("waqf.stoppingEffects")}</h2>
        <ul className="space-y-2">
          {(isAr && waqfData.stopping_effects_ar ? waqfData.stopping_effects_ar : waqfData.stopping_effects).map((effect, i) => (
            <li key={i} className="text-small text-text-muted flex gap-2">
              <span className="text-primary dark:text-primary-light shrink-0">-</span>
              {effect}
            </li>
          ))}
        </ul>
      </Card>

      <LessonNavigation
        prevHref="/learn/tafkheem-tarqeeq"
        prevLabel={{ en: "Heavy & Light", ar: "التفخيم والترقيق" }}
        onMarkComplete={() => markLessonComplete("waqf", "waqf-main")}
        isComplete={progress.lessonsCompleted.includes("waqf-main")}
        practiceModuleId="waqf"
      />

      <LessonProgress moduleId="waqf" sections={SECTIONS} />
    </div>
  );
}
