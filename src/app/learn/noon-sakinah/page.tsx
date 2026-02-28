"use client";

import { RuleCard } from "@/components/learn/RuleCard";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
import noonData from "@/data/content/noon-sakinah-tanween.json";

const RULE_COLORS: Record<string, string> = {
  "izhar-halqi": "#169200",
  "idgham": "#9400A8",
  "iqlab": "#26A69A",
  "ikhfaa": "#D98000",
};

export default function NoonSakinahPage() {
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("noon-sakinah");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{noonData.title_en}</h1>
        <ArabicText text={noonData.title_ar} size="sm" className="block text-text-muted mt-1" />
        <p className="text-sm text-text-muted mt-3">{noonData.introduction}</p>
      </div>

      <div className="space-y-4">
        {noonData.rules.map((rule) => {
          const color = RULE_COLORS[rule.id] ?? "#1B5E20";
          const allExamples = rule.examples
            ? rule.examples
            : (rule.subtypes ?? []).flatMap((st) => st.examples ?? []);

          return (
            <div key={rule.id}>
              <RuleCard
                titleEn={rule.title_en}
                titleAr={rule.title_ar}
                description={rule.description}
                letters={rule.letters}
                examples={allExamples}
                commonMistakes={rule.common_mistakes}
                color={color}
                mnemonicAr={rule.mnemonic_ar}
                mnemonicEn={rule.mnemonic_en}
              />

              {rule.subtypes && (
                <div className="ml-2 sm:ml-4 mt-2 space-y-2">
                  {rule.subtypes.map((st) => (
                    <RuleCard
                      key={st.id}
                      titleEn={st.title_en}
                      titleAr={st.title_ar ?? ""}
                      description={st.description}
                      letters={st.letters}
                      examples={st.examples}
                      color={color}
                      mnemonicEn={st.mnemonic_en}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {noonData.summary_table && (
        <Card>
          <h2 className="font-heading font-semibold mb-3">Quick Reference</h2>
          <p className="text-xs text-text-muted mb-3">{noonData.summary_table.description}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-semibold">Rule</th>
                  <th className="text-left py-2 pr-4 font-semibold">Letters</th>
                  <th className="text-right py-2 font-semibold">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="py-2 pr-4 font-medium" style={{ color: RULE_COLORS["izhar-halqi"] }}>Izhar</td>
                  <td className="py-2 pr-4"><ArabicText text={noonData.summary_table.izhar_letters} size="sm" /></td>
                  <td className="py-2 text-right">{noonData.summary_table.izhar_count}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium" style={{ color: RULE_COLORS["idgham"] }}>Idgham (with ghunnah)</td>
                  <td className="py-2 pr-4"><ArabicText text={noonData.summary_table.idgham_with_ghunnah_letters} size="sm" /></td>
                  <td className="py-2 text-right">4</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium" style={{ color: "#0057D9" }}>Idgham (no ghunnah)</td>
                  <td className="py-2 pr-4"><ArabicText text={noonData.summary_table.idgham_without_ghunnah_letters} size="sm" /></td>
                  <td className="py-2 text-right">2</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium" style={{ color: RULE_COLORS["iqlab"] }}>Iqlab</td>
                  <td className="py-2 pr-4"><ArabicText text={noonData.summary_table.iqlab_letters} size="sm" /></td>
                  <td className="py-2 text-right">{noonData.summary_table.iqlab_count}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium" style={{ color: RULE_COLORS["ikhfaa"] }}>Ikhfaa</td>
                  <td className="py-2 pr-4"><ArabicText text={noonData.summary_table.ikhfaa_letters} size="sm" /></td>
                  <td className="py-2 text-right">{noonData.summary_table.ikhfaa_count}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <LessonNavigation
        prevHref="/learn/makharij"
        prevLabel="Makharij"
        nextHref="/learn/meem-sakinah"
        nextLabel="Meem Sakinah"
        onMarkComplete={() => markLessonComplete("noon-sakinah", "noon-sakinah-main")}
        isComplete={progress.lessonsCompleted.includes("noon-sakinah-main")}
      />
    </div>
  );
}
