"use client";

import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { LockedModuleScreen } from "@/components/learn/LockedModuleScreen";
import { useProgress } from "@/hooks/useProgress";
import { useModuleLock } from "@/hooks/useModuleLock";
import LearnLoading from "../loading";
import { useTranslation } from "@/lib/i18n";
import tafkheemData from "@/data/content/tafkheem-tarqeeq.json";

export default function TafkheemTarqeeqPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("tafkheem-tarqeeq");
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("tafkheem-tarqeeq");
  const { t, isAr } = useTranslation();

  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={tafkheemData.title_en}
        moduleTitleAr={tafkheemData.title_ar}
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
          title={isAr ? tafkheemData.title_ar : tafkheemData.title_en}
          subtitle={isAr ? tafkheemData.title_en : tafkheemData.title_ar}
        />
        <p className="text-sm text-text-muted mt-4">
          {isAr ? (tafkheemData.introduction_ar ?? tafkheemData.introduction) : tafkheemData.introduction}
        </p>
      </div>

      {/* Always Heavy */}
      <Card>
        <h2 className="font-heading font-semibold">{isAr ? tafkheemData.always_heavy.title_ar : tafkheemData.always_heavy.title_en}</h2>

        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {tafkheemData.always_heavy.letters.map((letter) => (
            <div key={letter.arabic} className="text-center">
              <ArabicText text={letter.arabic} size="xl" className="block text-primary dark:text-primary-light" />
              <p className="text-xs text-text-muted mt-1">{isAr && letter.name_ar ? letter.name_ar : letter.name_en}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-gold-light/10 dark:bg-gold-dark/10 border border-gold-light/20 dark:border-gold-dark/20 text-center">
          <p className="text-xs font-semibold text-text-muted mb-1">{t("module.mnemonic")}</p>
          <ArabicText text={tafkheemData.always_heavy.mnemonic_ar} size="md" />
          {!isAr && <p className="text-xs text-text-muted mt-1">{tafkheemData.always_heavy.mnemonic_en}</p>}
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-semibold mb-2">{t("tafkheem.levels")}</h3>
          <ol className="space-y-1">
            {(isAr && tafkheemData.always_heavy.tafkheem_levels_ar ? tafkheemData.always_heavy.tafkheem_levels_ar : tafkheemData.always_heavy.tafkheem_levels).map((level, i) => (
              <li key={i} className="text-xs text-text-muted flex gap-2">
                <span className="text-primary dark:text-primary-light font-bold shrink-0">{i + 1}.</span>
                {level}
              </li>
            ))}
          </ol>
        </div>
      </Card>

      {/* Always Light */}
      <Card>
        <h2 className="font-heading font-semibold">{isAr ? tafkheemData.always_light.title_ar : tafkheemData.always_light.title_en}</h2>
        <p className="text-sm text-text-muted mt-2">{isAr && tafkheemData.always_light.description_ar ? tafkheemData.always_light.description_ar : tafkheemData.always_light.description}</p>

        <div className="mt-3">
          <ArabicText text={tafkheemData.always_light.letters} size="md" />
        </div>

        <p className="text-xs text-text-muted mt-2 italic">{isAr && tafkheemData.always_light.note_ar ? tafkheemData.always_light.note_ar : tafkheemData.always_light.note}</p>
      </Card>

      {/* Variable Letters */}
      <Card>
        <h2 className="font-heading font-semibold">{isAr ? tafkheemData.variable_letters.title_ar : tafkheemData.variable_letters.title_en}</h2>

        <div className="mt-4 space-y-3">
          {tafkheemData.variable_letters.letters.map((letter) => (
            <div key={letter.arabic} className="p-3 rounded-lg bg-cream-dark dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <ArabicText text={letter.arabic} size="lg" />
                <span className="text-sm font-medium">{isAr && letter.name_ar ? letter.name_ar : letter.name_en}</span>
              </div>
              <p className="text-xs text-text-muted">{isAr && letter.rule_ar ? letter.rule_ar : letter.rule}</p>
              {letter.heavy_example && (
                <p className="text-xs text-text-muted mt-1">
                  <span className="text-primary dark:text-primary-light font-medium">{t("tafkheem.alwaysHeavy").split(" ")[0]}:</span> {letter.heavy_example}
                </p>
              )}
              {letter.light_example && (
                <p className="text-xs text-text-muted mt-1">
                  <span className="text-blue-500 font-medium">{t("tafkheem.alwaysLight").split(" ")[0]}:</span> {letter.light_example}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {tafkheemData.common_mistakes.length > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-red-600 dark:text-red-400 mb-3">{t("module.commonMistakes")}</h2>
          <ul className="space-y-2">
            {(isAr && tafkheemData.common_mistakes_ar ? tafkheemData.common_mistakes_ar : tafkheemData.common_mistakes).map((mistake, i) => (
              <li key={i} className="text-sm text-text-muted flex gap-2">
                <span className="text-red-500 shrink-0">x</span>
                {mistake}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <LessonNavigation
        prevHref="/learn/laam-raa"
        prevLabel={{ en: "Laam & Raa", ar: "اللام والراء" }}
        nextHref="/learn/waqf"
        nextLabel={{ en: "Waqf", ar: "الوقف" }}
        onMarkComplete={() => markLessonComplete("tafkheem-tarqeeq", "tafkheem-tarqeeq-main")}
        isComplete={progress.lessonsCompleted.includes("tafkheem-tarqeeq-main")}
      />
    </div>
  );
}
