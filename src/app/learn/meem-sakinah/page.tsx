"use client";

import { RuleCard } from "@/components/learn/RuleCard";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import meemData from "@/data/content/meem-sakinah.json";

const RULE_COLORS: Record<string, string> = {
  "ikhfaa-shafawi": "#D98000",
  "idgham-shafawi": "#9400A8",
  "izhar-shafawi": "#169200",
};

export default function MeemSakinahPage() {
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("meem-sakinah");
  const { t, isAr } = useTranslation();

  return (
    <div className="space-y-8">
      <div>
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
          <RuleCard
            key={rule.id}
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
        ))}
      </div>

      <LessonNavigation
        prevHref="/learn/noon-sakinah"
        prevLabel={{ en: "Noon Sakinah", ar: "النون الساكنة والتنوين" }}
        nextHref="/learn/ghunnah"
        nextLabel={{ en: "Ghunnah", ar: "الغنّة" }}
        onMarkComplete={() => markLessonComplete("meem-sakinah", "meem-sakinah-main")}
        isComplete={progress.lessonsCompleted.includes("meem-sakinah-main")}
      />
    </div>
  );
}
