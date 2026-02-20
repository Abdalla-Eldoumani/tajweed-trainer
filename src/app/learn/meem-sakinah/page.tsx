"use client";

import { RuleCard } from "@/components/learn/RuleCard";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
import meemData from "@/data/content/meem-sakinah.json";

const RULE_COLORS: Record<string, string> = {
  "ikhfaa-shafawi": "#D98000",
  "idgham-shafawi": "#9400A8",
  "izhar-shafawi": "#169200",
};

export default function MeemSakinahPage() {
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("meem-sakinah");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{meemData.title_en}</h1>
        <p className="font-arabic text-lg text-text-muted mt-1" dir="rtl" lang="ar">
          {meemData.title_ar}
        </p>
        <p className="text-sm text-text-muted mt-3">{meemData.introduction}</p>
      </div>

      <div className="space-y-4">
        {meemData.rules.map((rule) => (
          <RuleCard
            key={rule.id}
            titleEn={rule.title_en}
            titleAr={rule.title_ar}
            description={rule.description}
            letters={rule.letters}
            examples={rule.examples}
            commonMistakes={rule.common_mistakes}
            color={RULE_COLORS[rule.id] ?? "#1B5E20"}
          />
        ))}
      </div>

      <LessonNavigation
        prevHref="/learn/noon-sakinah"
        prevLabel="Noon Sakinah"
        nextHref="/learn/ghunnah"
        nextLabel="Ghunnah"
        onMarkComplete={() => markLessonComplete("meem-sakinah", "meem-sakinah-main")}
        isComplete={progress.lessonsCompleted.includes("meem-sakinah-main")}
      />
    </div>
  );
}
