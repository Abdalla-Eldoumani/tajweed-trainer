"use client";

import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { ExampleCard } from "@/components/learn/ExampleCard";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { LockedModuleScreen } from "@/components/learn/LockedModuleScreen";
import { useProgress } from "@/hooks/useProgress";
import { useModuleLock } from "@/hooks/useModuleLock";
import LearnLoading from "../loading";
import { useTranslation } from "@/lib/i18n";
import laamRaaData from "@/data/content/laam-raa-rules.json";

export default function LaamRaaPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("laam-raa");
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("laam-raa");
  const { t, isAr } = useTranslation();

  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={laamRaaData.title_en}
        moduleTitleAr={laamRaaData.title_ar}
        prereqId={prereqId}
        prereqTitleEn={prereqTitleEn}
        prereqTitleAr={prereqTitleAr}
      />
    );
  }

  const laamSection = laamRaaData.sections[0]; // laam-shamsiyyah-qamariyyah
  const laamAllahSection = laamRaaData.sections[1]; // laam-lafzul-jalalah
  const raaSection = laamRaaData.sections[2]; // raa-rules

  return (
    <div className="space-y-8">
      <div>
        <SectionBanner
          title={isAr ? laamRaaData.title_ar : laamRaaData.title_en}
          subtitle={isAr ? laamRaaData.title_en : laamRaaData.title_ar}
        />
        <p className="text-sm text-text-muted mt-4">
          {isAr ? (laamRaaData.introduction_ar ?? laamRaaData.introduction ?? t("module.laam-raa.intro")) : (laamRaaData.introduction ?? t("module.laam-raa.intro"))}
        </p>
      </div>

      {/* Laam Shamsiyyah/Qamariyyah */}
      <Card id="laam-shamsiyyah-qamariyyah" className="scroll-mt-20">
        <h2 className="font-heading font-semibold">{isAr ? laamSection.title_ar : laamSection.title_en}</h2>
        {!isAr && <ArabicText text={laamSection.title_ar} size="sm" className="text-text-muted" />}
        <p className="text-sm text-text-muted mt-2">{isAr && laamSection.description_ar ? laamSection.description_ar : laamSection.description}</p>

        {laamSection.subtypes?.map((st) => (
          <div key={st.id} id={st.id} className="mt-4 p-4 rounded-lg bg-cream-dark dark:bg-gray-800 scroll-mt-20">
            <h3 className="font-heading font-semibold text-sm">{isAr ? st.title_ar : st.title_en}</h3>
            {!isAr && <ArabicText text={st.title_ar} size="sm" className="text-text-muted" />}
            <p className="text-xs text-text-muted mt-2">{isAr && st.description_ar ? st.description_ar : st.description}</p>

            <div className="mt-3">
              <p className="text-xs font-medium mb-1">{t("module.letters")} ({st.letter_count}):</p>
              <ArabicText text={st.letters} size="sm" />
            </div>

            {st.mnemonic_ar && (
              <div className="mt-2 p-2 rounded bg-accent/10">
                <p className="text-[10px] font-semibold text-text-muted">{t("module.mnemonic")}:</p>
                <ArabicText text={st.mnemonic_ar} size="sm" />
              </div>
            )}

            {st.examples?.map((ex, i) => (
              <div key={i} className="mt-3">
                <ExampleCard example={ex} color={st.id === "laam-shamsiyyah" ? "#707070" : "#1B5E20"} />
              </div>
            ))}
          </div>
        ))}
      </Card>

      {/* Laam of Allah */}
      <Card id="laam-lafzul-jalalah" className="scroll-mt-20">
        <h2 className="font-heading font-semibold">{isAr ? laamAllahSection.title_ar : laamAllahSection.title_en}</h2>
        {!isAr && <ArabicText text={laamAllahSection.title_ar} size="sm" className="text-text-muted" />}
        <p className="text-sm text-text-muted mt-2">{isAr && laamAllahSection.description_ar ? laamAllahSection.description_ar : laamAllahSection.description}</p>

        {laamAllahSection.rules?.map((rule, i) => (
          <div key={i} className="mt-3 p-3 rounded-lg bg-cream-dark dark:bg-gray-800">
            <p className="text-xs font-medium">{isAr && rule.condition_ar ? rule.condition_ar : rule.condition}</p>
            <p className="text-xs text-primary dark:text-primary-light mt-1">{isAr && rule.result_ar ? rule.result_ar : rule.result}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rule.examples.map((ex, j) => (
                <span key={j} className="px-2 py-1 rounded bg-bg dark:bg-bg-dark">
                  <ArabicText text={ex} size="sm" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </Card>

      {/* Raa Rules */}
      <Card id="raa-rules" className="scroll-mt-20">
        <h2 className="font-heading font-semibold">{isAr ? raaSection.title_ar : raaSection.title_en}</h2>
        {!isAr && <ArabicText text={raaSection.title_ar} size="sm" className="text-text-muted" />}
        <p className="text-sm text-text-muted mt-2">{isAr && raaSection.description_ar ? raaSection.description_ar : raaSection.description}</p>

        {raaSection.tafkheem_cases && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold mb-2">{t("laamRaa.heavyRaa")}</h3>
            <div className="space-y-2">
              {raaSection.tafkheem_cases.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-cream-dark dark:bg-gray-800">
                  <span className="text-primary dark:text-primary-light shrink-0 font-bold">&uarr;</span>
                  <div>
                    <p className="font-medium">{isAr && c.condition_ar ? c.condition_ar : c.condition}</p>
                    <p className="text-text-muted mt-0.5">
                      {t("laamRaa.example")}: <ArabicText text={c.example} size="sm" />, {isAr && c.note_ar ? c.note_ar : c.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {raaSection.tarqeeq_cases && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold mb-2">{t("laamRaa.lightRaa")}</h3>
            <div className="space-y-2">
              {raaSection.tarqeeq_cases.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-cream-dark dark:bg-gray-800">
                  <span className="text-blue-500 shrink-0 font-bold">&darr;</span>
                  <div>
                    <p className="font-medium">{isAr && c.condition_ar ? c.condition_ar : c.condition}</p>
                    <p className="text-text-muted mt-0.5">
                      {t("laamRaa.example")}: <ArabicText text={c.example} size="sm" />, {isAr && c.note_ar ? c.note_ar : c.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <LessonNavigation
        prevHref="/learn/madd"
        prevLabel={{ en: "Madd", ar: "أحكام المد" }}
        nextHref="/learn/tafkheem-tarqeeq"
        nextLabel={{ en: "Heavy & Light", ar: "التفخيم والترقيق" }}
        onMarkComplete={() => markLessonComplete("laam-raa", "laam-raa-main")}
        isComplete={progress.lessonsCompleted.includes("laam-raa-main")}
        practiceModuleId="laam-raa"
      />
    </div>
  );
}
