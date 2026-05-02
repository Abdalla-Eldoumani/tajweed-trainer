"use client";

import { RuleCard } from "@/components/learn/RuleCard";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { LockedModuleScreen } from "@/components/learn/LockedModuleScreen";
import { useProgress } from "@/hooks/useProgress";
import { useModuleLock } from "@/hooks/useModuleLock";
import LearnLoading from "../loading";
import { useTranslation } from "@/lib/i18n";
import qalqalahData from "@/data/content/qalqalah.json";

export default function QalqalahPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("qalqalah");
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("qalqalah");
  const { t, isAr } = useTranslation();

  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={qalqalahData.title_en}
        moduleTitleAr={qalqalahData.title_ar}
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
          title={isAr ? qalqalahData.title_ar : qalqalahData.title_en}
          subtitle={isAr ? qalqalahData.title_en : qalqalahData.title_ar}
        />
        <p className="text-sm text-text-muted mt-4">
          {isAr ? (qalqalahData.introduction_ar ?? qalqalahData.introduction) : qalqalahData.introduction}
        </p>
      </div>

      <Card id="qalqalah-letters">
        <h2 className="font-heading font-semibold mb-3">{t("qalqalah.fiveLetters")}</h2>
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          {qalqalahData.letters.map((letter) => (
            <div key={letter.arabic} className="text-center">
              <ArabicText text={letter.arabic} size="xl" className="block text-tajweed-qalqalah" />
              <p className="text-xs text-text-muted mt-1">{isAr ? (letter.name_ar ?? letter.name_en) : letter.name_en}</p>
            </div>
          ))}
        </div>
        <div id="qalqalah-mnemonic" className="p-3 rounded-lg bg-accent/10 text-center scroll-mt-20">
          <p className="text-xs font-semibold text-text-muted mb-1">{t("module.mnemonic")}</p>
          <ArabicText text={qalqalahData.mnemonic_ar} size="md" />
          {!isAr && <p className="text-xs text-text-muted mt-1">{qalqalahData.mnemonic_en}</p>}
        </div>
      </Card>

      <div className="space-y-4">
        {qalqalahData.levels.map((level) => (
          // Anchor target for question explanations that link back to a specific
          // level. scroll-mt-20 keeps the heading clear of the sticky header.
          <div key={level.id} id={level.id} className="scroll-mt-20">
            <RuleCard
              titleEn={level.title_en}
              titleAr={level.title_ar}
              description={level.description}
              descriptionAr={level.description_ar}
              examples={level.examples}
              color="#A30000"
              defaultExpanded
            />
          </div>
        ))}
      </div>

      {qalqalahData.common_mistakes.length > 0 && (
        <Card id="qalqalah-mistakes">
          <h2 className="font-heading font-semibold text-red-600 dark:text-red-400 mb-3">{t("module.commonMistakes")}</h2>
          <ul className="space-y-2">
            {(isAr && qalqalahData.common_mistakes_ar ? qalqalahData.common_mistakes_ar : qalqalahData.common_mistakes).map((mistake, i) => (
              <li key={i} className="text-sm text-text-muted flex gap-2">
                <span className="text-red-500 shrink-0">x</span>
                {mistake}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <LessonNavigation
        prevHref="/learn/ghunnah"
        prevLabel={{ en: "Ghunnah", ar: "الغنّة" }}
        nextHref="/learn/madd"
        nextLabel={{ en: "Madd", ar: "أحكام المد" }}
        onMarkComplete={() => markLessonComplete("qalqalah", "qalqalah-main")}
        isComplete={progress.lessonsCompleted.includes("qalqalah-main")}
      />
    </div>
  );
}
