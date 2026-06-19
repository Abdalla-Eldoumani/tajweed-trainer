"use client";

import { RuleCard } from "@/components/learn/RuleCard";
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
import { getColorForClass } from "@/lib/tajweed-colors";
import noonData from "@/data/content/noon-sakinah-tanween.json";

const SECTIONS = [
  "noon-sakinah-overview",
  ...noonData.rules.flatMap((r) => [r.id, ...((r.subtypes ?? []).map((st) => st.id))]),
];

// Rule-indicator colors from the single tajweed source (tajweed-colors.ts),
// keyed by the API class each rule maps to. Izhar is not emitted by the API
// (default ink in the mushaf), so it keeps its teaching green rather than a class.
const IZHAR_COLOR = "#169200";
const tajHex = (cssClass: string) => getColorForClass(cssClass)?.hex ?? IZHAR_COLOR;
const RULE_COLORS: Record<string, string> = {
  "izhar-halqi": IZHAR_COLOR,
  "idgham": tajHex("idgham_ghunnah"),
  "iqlab": tajHex("iqlab"),
  "ikhfaa": tajHex("ikhafa"),
};

export default function NoonSakinahPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("noon-sakinah");
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("noon-sakinah");
  const { t, isAr } = useTranslation();

  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={noonData.title_en}
        moduleTitleAr={noonData.title_ar}
        prereqId={prereqId}
        prereqTitleEn={prereqTitleEn}
        prereqTitleAr={prereqTitleAr}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div id="noon-sakinah-overview" className="scroll-mt-20">
        <SectionBanner
          title={isAr ? noonData.title_ar : noonData.title_en}
          subtitle={isAr ? noonData.title_en : noonData.title_ar}
        />
        <p className="text-small text-text-muted mt-4">
          {isAr ? (noonData.introduction_ar ?? noonData.introduction) : noonData.introduction}
        </p>
      </div>

      <div className="space-y-4">
        {noonData.rules.map((rule) => {
          const color = RULE_COLORS[rule.id] ?? "#1B5E20";
          const allExamples = rule.examples
            ? rule.examples
            : (rule.subtypes ?? []).flatMap((st) => st.examples ?? []);

          return (
            <div key={rule.id} id={rule.id} className="scroll-mt-20">
              <RuleCard
                titleEn={rule.title_en}
                titleAr={rule.title_ar}
                description={rule.description}
                descriptionAr={rule.description_ar}
                letters={rule.letters}
                examples={allExamples}
                commonMistakes={rule.common_mistakes}
                commonMistakesAr={rule.common_mistakes_ar}
                color={color}
                mnemonicAr={rule.mnemonic_ar}
                mnemonicEn={rule.mnemonic_en}
              />

              {rule.subtypes && (
                <div className="ms-2 sm:ms-4 mt-2 space-y-2">
                  {rule.subtypes.map((st) => (
                    <div key={st.id} id={st.id} className="scroll-mt-20">
                      <RuleCard
                        titleEn={st.title_en}
                        titleAr={st.title_ar ?? ""}
                        description={st.description}
                        descriptionAr={st.description_ar}
                        letters={st.letters}
                        examples={st.examples}
                        color={color}
                        mnemonicEn={st.mnemonic_en}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {noonData.summary_table && (
        <Card variant="ornate">
          <h2 className="font-heading font-semibold text-h2 mb-3">{t("module.quickReference")}</h2>
          <p className="text-micro text-text-muted mb-3">{isAr && noonData.summary_table.description_ar ? noonData.summary_table.description_ar : noonData.summary_table.description}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-micro">
              <thead>
                <tr className="border-b border-gold-light/30 dark:border-gold-dark/20">
                  <th className="text-start py-2 pe-4 font-semibold">{t("module.rule")}</th>
                  <th className="text-start py-2 pe-4 font-semibold">{t("module.letters")}</th>
                  <th className="text-end py-2 font-semibold">{t("module.count")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-light/20 dark:divide-gold-dark/10">
                <tr>
                  <td className="py-2 pe-4 font-medium" style={{ color: RULE_COLORS["izhar-halqi"] }}>{isAr ? "الإظهار" : "Izhar"}</td>
                  <td className="py-2 pe-4"><ArabicText text={noonData.summary_table.izhar_letters} size="sm" /></td>
                  <td className="py-2 text-end">{noonData.summary_table.izhar_count}</td>
                </tr>
                <tr>
                  <td className="py-2 pe-4 font-medium" style={{ color: RULE_COLORS["idgham"] }}>{isAr ? "الإدغام بغنّة" : "Idgham (with ghunnah)"}</td>
                  <td className="py-2 pe-4"><ArabicText text={noonData.summary_table.idgham_with_ghunnah_letters} size="sm" /></td>
                  <td className="py-2 text-end">4</td>
                </tr>
                <tr>
                  <td className="py-2 pe-4 font-medium" style={{ color: tajHex("idgham_wo_ghunnah") }}>{isAr ? "الإدغام بلا غنّة" : "Idgham (no ghunnah)"}</td>
                  <td className="py-2 pe-4"><ArabicText text={noonData.summary_table.idgham_without_ghunnah_letters} size="sm" /></td>
                  <td className="py-2 text-end">2</td>
                </tr>
                <tr>
                  <td className="py-2 pe-4 font-medium" style={{ color: RULE_COLORS["iqlab"] }}>{isAr ? "الإقلاب" : "Iqlab"}</td>
                  <td className="py-2 pe-4"><ArabicText text={noonData.summary_table.iqlab_letters} size="sm" /></td>
                  <td className="py-2 text-end">{noonData.summary_table.iqlab_count}</td>
                </tr>
                <tr>
                  <td className="py-2 pe-4 font-medium" style={{ color: RULE_COLORS["ikhfaa"] }}>{isAr ? "الإخفاء" : "Ikhfaa"}</td>
                  <td className="py-2 pe-4"><ArabicText text={noonData.summary_table.ikhfaa_letters} size="sm" /></td>
                  <td className="py-2 text-end">{noonData.summary_table.ikhfaa_count}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <LessonNavigation
        prevHref="/learn/makharij"
        prevLabel={{ en: "Makharij", ar: "مخارج الحروف" }}
        nextHref="/learn/meem-sakinah"
        nextLabel={{ en: "Meem Sakinah", ar: "الميم الساكنة" }}
        onMarkComplete={() => markLessonComplete("noon-sakinah", "noon-sakinah-main")}
        isComplete={progress.lessonsCompleted.includes("noon-sakinah-main")}
        practiceModuleId="noon-sakinah"
      />

      <LessonProgress moduleId="noon-sakinah" sections={SECTIONS} />
    </div>
  );
}
