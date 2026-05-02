"use client";

import { RuleCard } from "@/components/learn/RuleCard";
import { Card } from "@/components/ui/Card";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { LockedModuleScreen } from "@/components/learn/LockedModuleScreen";
import { useProgress } from "@/hooks/useProgress";
import { useModuleLock } from "@/hooks/useModuleLock";
import LearnLoading from "../loading";
import { useTranslation } from "@/lib/i18n";
import ghunnahData from "@/data/content/ghunnah.json";

export default function GhunnahPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("ghunnah");
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("ghunnah");
  const { t, isAr } = useTranslation();

  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={ghunnahData.title_en}
        moduleTitleAr={ghunnahData.title_ar}
        prereqId={prereqId}
        prereqTitleEn={prereqTitleEn}
        prereqTitleAr={prereqTitleAr}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionBanner
          title={isAr ? ghunnahData.title_ar : ghunnahData.title_en}
          subtitle={isAr ? ghunnahData.title_en : ghunnahData.title_ar}
        />
        <p className="text-sm text-text-muted mt-4">
          {isAr ? (ghunnahData.introduction_ar ?? ghunnahData.introduction) : ghunnahData.introduction}
        </p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-2">{t("ghunnah.definition")}</h2>
        <p className="text-sm text-text-muted">{isAr && ghunnahData.definition_ar ? ghunnahData.definition_ar : ghunnahData.definition}</p>
        <p className="text-sm font-medium mt-2 text-primary dark:text-primary-light">
          {t("ghunnah.duration")}: {isAr && ghunnahData.duration_ar ? ghunnahData.duration_ar : ghunnahData.duration}
        </p>
      </Card>

      <div className="space-y-4">
        {ghunnahData.rules.map((rule) => (
          <RuleCard
            key={rule.id}
            titleEn={rule.title_en}
            titleAr={rule.title_ar}
            description={rule.description}
            descriptionAr={rule.description_ar}
            examples={rule.examples}
            color="#169200"
            defaultExpanded
          />
        ))}
      </div>

      <Card variant="ornate">
        <h2 className="font-heading font-semibold mb-3">{t("ghunnah.ranking")}</h2>
        <div className="space-y-2">
          {ghunnahData.ghunnah_prominence_ranking.map((item) => (
            <div key={item.rank} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light flex items-center justify-center text-xs font-bold">
                {item.rank}
              </span>
              <div className="flex-1">
                <span className="font-medium">{isAr && item.context_ar ? item.context_ar : item.context}</span>
                <span className="text-text-muted ms-2">({isAr && item.prominence_ar ? item.prominence_ar : item.prominence})</span>
              </div>
              <span className="text-xs text-text-muted">{item.beats} {t("ghunnah.beats")}</span>
            </div>
          ))}
        </div>
      </Card>

      {ghunnahData.common_mistakes.length > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-red-600 dark:text-red-400 mb-3">{t("module.commonMistakes")}</h2>
          <ul className="space-y-2">
            {(isAr && ghunnahData.common_mistakes_ar ? ghunnahData.common_mistakes_ar : ghunnahData.common_mistakes).map((mistake, i) => (
              <li key={i} className="text-sm text-text-muted flex gap-2">
                <span className="text-red-500 shrink-0">x</span>
                {mistake}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <LessonNavigation
        prevHref="/learn/meem-sakinah"
        prevLabel={{ en: "Meem Sakinah", ar: "الميم الساكنة" }}
        nextHref="/learn/qalqalah"
        nextLabel={{ en: "Qalqalah", ar: "القلقلة" }}
        onMarkComplete={() => markLessonComplete("ghunnah", "ghunnah-main")}
        isComplete={progress.lessonsCompleted.includes("ghunnah-main")}
      />
    </div>
  );
}
