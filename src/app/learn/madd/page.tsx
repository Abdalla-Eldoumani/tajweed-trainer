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
import maddData from "@/data/content/madd-rules.json";

const MADD_COLORS: Record<string, string> = {
  "madd-tabeeee": "#E06050",
  "madd-muttasil": "#D50000",
  "madd-munfasil": "#E8567F",
  "madd-arid": "#E06050",
  "madd-lazim": "#D50000",
  "madd-badal": "#E06050",
  "madd-leen": "#E8567F",
};

export default function MaddPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("madd");
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("madd");
  const { t, isAr } = useTranslation();

  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={maddData.title_en}
        moduleTitleAr={maddData.title_ar}
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
          title={isAr ? maddData.title_ar : maddData.title_en}
          subtitle={isAr ? maddData.title_en : maddData.title_ar}
        />
        <p className="text-sm text-text-muted mt-4">
          {isAr ? (maddData.introduction_ar ?? maddData.introduction) : maddData.introduction}
        </p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">{t("madd.letters")}</h2>
        <div className="flex flex-wrap justify-center gap-6">
          {maddData.madd_letters.map((letter) => (
            <div key={letter.arabic} className="text-center">
              <ArabicText text={letter.arabic} size="xl" className="block" />
              <p className="text-xs font-medium mt-1">{isAr ? (letter.name_ar ?? letter.name_en) : letter.name_en}</p>
              <p className="text-[10px] text-text-muted">{isAr ? (letter.condition_ar ?? letter.condition) : letter.condition}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {maddData.types.map((type) => (
          <RuleCard
            key={type.id}
            titleEn={`${type.title_en} (${type.beats} beats)`}
            titleAr={`${type.title_ar} (${type.beats} ${t("ghunnah.beats")})`}
            description={type.description}
            descriptionAr={type.description_ar}
            examples={type.examples}
            color={MADD_COLORS[type.id] ?? "#E06050"}
          />
        ))}
      </div>

      <Card variant="ornate">
        <h2 className="font-heading font-semibold mb-3">{t("madd.summaryTable")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gold-light/30 dark:border-gold-dark/20">
                <th className="text-start py-2 pe-4 font-semibold">{t("madd.type")}</th>
                <th className="text-center py-2 pe-4 font-semibold">{t("madd.beats")}</th>
                <th className="text-start py-2 font-semibold">{t("madd.trigger")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-light/20 dark:divide-gold-dark/10">
              {Object.entries(maddData.summary_table).map(([key, val]) => (
                <tr key={key}>
                  <td className="py-2 pe-4 font-medium">{isAr && val.type_ar ? val.type_ar : val.type}</td>
                  <td className="py-2 pe-4 text-center">{val.beats}</td>
                  <td className="py-2 text-text-muted">{isAr && val.trigger_ar ? val.trigger_ar : val.trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <LessonNavigation
        prevHref="/learn/qalqalah"
        prevLabel={{ en: "Qalqalah", ar: "القلقلة" }}
        nextHref="/learn/laam-raa"
        nextLabel={{ en: "Laam & Raa", ar: "اللام والراء" }}
        onMarkComplete={() => markLessonComplete("madd", "madd-main")}
        isComplete={progress.lessonsCompleted.includes("madd-main")}
      />
    </div>
  );
}
