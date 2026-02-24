"use client";

import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
import tafkheemData from "@/data/content/tafkheem-tarqeeq.json";

export default function TafkheemTarqeeqPage() {
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("tafkheem-tarqeeq");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{tafkheemData.title_en}</h1>
        <ArabicText text={tafkheemData.title_ar} size="sm" className="block text-text-muted mt-1" />
        <p className="text-sm text-text-muted mt-3">{tafkheemData.introduction}</p>
      </div>

      {/* Always Heavy */}
      <Card>
        <h2 className="font-heading font-semibold">{tafkheemData.always_heavy.title_en}</h2>
        <ArabicText text={tafkheemData.always_heavy.title_ar} size="sm" className="text-text-muted" />

        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {tafkheemData.always_heavy.letters.map((letter) => (
            <div key={letter.arabic} className="text-center">
              <ArabicText text={letter.arabic} size="xl" className="block text-primary dark:text-primary-light" />
              <p className="text-xs text-text-muted mt-1">{letter.name_en}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-accent/10 text-center">
          <p className="text-xs font-semibold text-text-muted mb-1">Mnemonic</p>
          <ArabicText text={tafkheemData.always_heavy.mnemonic_ar} size="md" />
          <p className="text-xs text-text-muted mt-1">{tafkheemData.always_heavy.mnemonic_en}</p>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-semibold mb-2">5 Levels of Tafkheem (strongest to lightest)</h3>
          <ol className="space-y-1">
            {tafkheemData.always_heavy.tafkheem_levels.map((level, i) => (
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
        <h2 className="font-heading font-semibold">{tafkheemData.always_light.title_en}</h2>
        <ArabicText text={tafkheemData.always_light.title_ar} size="sm" className="text-text-muted" />
        <p className="text-sm text-text-muted mt-2">{tafkheemData.always_light.description}</p>

        <div className="mt-3">
          <ArabicText text={tafkheemData.always_light.letters} size="md" />
        </div>

        <p className="text-xs text-text-muted mt-2 italic">{tafkheemData.always_light.note}</p>
      </Card>

      {/* Variable Letters */}
      <Card>
        <h2 className="font-heading font-semibold">{tafkheemData.variable_letters.title_en}</h2>
        <ArabicText text={tafkheemData.variable_letters.title_ar} size="sm" className="text-text-muted" />

        <div className="mt-4 space-y-3">
          {tafkheemData.variable_letters.letters.map((letter) => (
            <div key={letter.arabic} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <ArabicText text={letter.arabic} size="lg" />
                <span className="text-sm font-medium">{letter.name_en}</span>
              </div>
              <p className="text-xs text-text-muted">{letter.rule}</p>
              {letter.heavy_example && (
                <p className="text-xs text-text-muted mt-1">
                  <span className="text-primary dark:text-primary-light font-medium">Heavy:</span> {letter.heavy_example}
                </p>
              )}
              {letter.light_example && (
                <p className="text-xs text-text-muted mt-1">
                  <span className="text-blue-500 font-medium">Light:</span> {letter.light_example}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {tafkheemData.common_mistakes.length > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-red-600 dark:text-red-400 mb-3">Common Mistakes</h2>
          <ul className="space-y-2">
            {tafkheemData.common_mistakes.map((mistake, i) => (
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
        prevLabel="Laam & Raa"
        nextHref="/learn/waqf"
        nextLabel="Waqf"
        onMarkComplete={() => markLessonComplete("tafkheem-tarqeeq", "tafkheem-tarqeeq-main")}
        isComplete={progress.lessonsCompleted.includes("tafkheem-tarqeeq-main")}
      />
    </div>
  );
}
