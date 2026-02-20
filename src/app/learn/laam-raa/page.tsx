"use client";

import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { ExampleCard } from "@/components/learn/ExampleCard";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
import laamRaaData from "@/data/content/laam-raa-rules.json";

export default function LaamRaaPage() {
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("laam-raa");

  const laamSection = laamRaaData.sections[0]; // laam-shamsiyyah-qamariyyah
  const laamAllahSection = laamRaaData.sections[1]; // laam-lafzul-jalalah
  const raaSection = laamRaaData.sections[2]; // raa-rules

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{laamRaaData.title_en}</h1>
        <p className="font-arabic text-lg text-text-muted mt-1" dir="rtl" lang="ar">
          {laamRaaData.title_ar}
        </p>
      </div>

      {/* Laam Shamsiyyah/Qamariyyah */}
      <Card>
        <h2 className="font-heading font-semibold">{laamSection.title_en}</h2>
        <p className="font-arabic text-sm text-text-muted" dir="rtl" lang="ar">{laamSection.title_ar}</p>
        <p className="text-sm text-text-muted mt-2">{laamSection.description}</p>

        {laamSection.subtypes?.map((st) => (
          <div key={st.id} className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-heading font-semibold text-sm">{st.title_en}</h3>
            <p className="font-arabic text-xs text-text-muted" dir="rtl" lang="ar">{st.title_ar}</p>
            <p className="text-xs text-text-muted mt-2">{st.description}</p>

            <div className="mt-3">
              <p className="text-xs font-medium mb-1">Letters ({st.letter_count}):</p>
              <ArabicText text={st.letters} size="sm" />
            </div>

            {st.mnemonic_ar && (
              <div className="mt-2 p-2 rounded bg-accent/10">
                <p className="text-[10px] font-semibold text-text-muted">Mnemonic:</p>
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
      <Card>
        <h2 className="font-heading font-semibold">{laamAllahSection.title_en}</h2>
        <p className="font-arabic text-sm text-text-muted" dir="rtl" lang="ar">{laamAllahSection.title_ar}</p>
        <p className="text-sm text-text-muted mt-2">{laamAllahSection.description}</p>

        {laamAllahSection.rules?.map((rule, i) => (
          <div key={i} className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs font-medium">{rule.condition}</p>
            <p className="text-xs text-primary dark:text-primary-light mt-1">{rule.result}</p>
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
      <Card>
        <h2 className="font-heading font-semibold">{raaSection.title_en}</h2>
        <p className="font-arabic text-sm text-text-muted" dir="rtl" lang="ar">{raaSection.title_ar}</p>
        <p className="text-sm text-text-muted mt-2">{raaSection.description}</p>

        {raaSection.tafkheem_cases && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold mb-2">Raa with Tafkheem (Heavy)</h3>
            <div className="space-y-2">
              {raaSection.tafkheem_cases.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <span className="text-primary dark:text-primary-light shrink-0 font-bold">&uarr;</span>
                  <div>
                    <p className="font-medium">{c.condition}</p>
                    <p className="text-text-muted mt-0.5">
                      Example: <ArabicText text={c.example} size="sm" /> — {c.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {raaSection.tarqeeq_cases && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold mb-2">Raa with Tarqeeq (Light)</h3>
            <div className="space-y-2">
              {raaSection.tarqeeq_cases.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <span className="text-blue-500 shrink-0 font-bold">&darr;</span>
                  <div>
                    <p className="font-medium">{c.condition}</p>
                    <p className="text-text-muted mt-0.5">
                      Example: <ArabicText text={c.example} size="sm" /> — {c.note}
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
        prevLabel="Madd"
        nextHref="/learn/tafkheem-tarqeeq"
        nextLabel="Heavy & Light"
        onMarkComplete={() => markLessonComplete("laam-raa", "laam-raa-main")}
        isComplete={progress.lessonsCompleted.includes("laam-raa-main")}
      />
    </div>
  );
}
