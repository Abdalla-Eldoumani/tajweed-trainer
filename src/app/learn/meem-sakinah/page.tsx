"use client";

import { RuleCard } from "@/components/learn/RuleCard";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { LessonProgress } from "@/components/learn/LessonProgress";
import { LockedModuleScreen } from "@/components/learn/LockedModuleScreen";
import { useProgress } from "@/hooks/useProgress";
import { useModuleLock } from "@/hooks/useModuleLock";
import LearnLoading from "../loading";
import { useTranslation } from "@/lib/i18n";
import meemData from "@/data/content/meem-sakinah.json";

const SECTIONS = ["meem-sakinah-overview", ...meemData.rules.map((r) => r.id)];

const RULE_COLORS: Record<string, string> = {
  "ikhfaa-shafawi": "#D98000",
  "idgham-shafawi": "#9400A8",
  "izhar-shafawi": "#169200",
};

export default function MeemSakinahPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("meem-sakinah");
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("meem-sakinah");
  const { t, isAr } = useTranslation();

  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={meemData.title_en}
        moduleTitleAr={meemData.title_ar}
        prereqId={prereqId}
        prereqTitleEn={prereqTitleEn}
        prereqTitleAr={prereqTitleAr}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div id="meem-sakinah-overview" className="scroll-mt-20">
        <SectionBanner
          title={isAr ? meemData.title_ar : meemData.title_en}
          subtitle={isAr ? meemData.title_en : meemData.title_ar}
        />
        <p className="text-sm text-text-muted mt-4">
          {isAr ? (meemData.introduction_ar ?? meemData.introduction) : meemData.introduction}
        </p>
      </div>

      <div className="space-y-4">
        {meemData.rules.map((rule) => (
          <div key={rule.id} id={rule.id} className="scroll-mt-20">
            <RuleCard
              titleEn={rule.title_en}
              titleAr={rule.title_ar}
              description={rule.description}
              descriptionAr={rule.description_ar}
              letters={rule.letters}
              examples={rule.examples}
              commonMistakes={rule.common_mistakes}
              commonMistakesAr={rule.common_mistakes_ar}
              color={RULE_COLORS[rule.id] ?? "#1B5E20"}
            />
          </div>
        ))}
      </div>

      <LessonNavigation
        prevHref="/learn/noon-sakinah"
        prevLabel={{ en: "Noon Sakinah", ar: "النون الساكنة والتنوين" }}
        nextHref="/learn/ghunnah"
        nextLabel={{ en: "Ghunnah", ar: "الغنّة" }}
        onMarkComplete={() => markLessonComplete("meem-sakinah", "meem-sakinah-main")}
        isComplete={progress.lessonsCompleted.includes("meem-sakinah-main")}
        practiceModuleId="meem-sakinah"
      />

      <LessonProgress moduleId="meem-sakinah" sections={SECTIONS} />
    </div>
  );
}
