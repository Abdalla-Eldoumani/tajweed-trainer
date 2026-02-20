"use client";

import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
import waqfData from "@/data/content/waqf-symbols.json";

export default function WaqfPage() {
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("waqf");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{waqfData.title_en}</h1>
        <p className="font-arabic text-lg text-text-muted mt-1" dir="rtl" lang="ar">
          {waqfData.title_ar}
        </p>
        <p className="text-sm text-text-muted mt-3">{waqfData.introduction}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {waqfData.symbols.map((symbol) => (
          <Card key={symbol.id}>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 shrink-0">
                <ArabicText text={symbol.symbol} size="md" className="text-accent" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm">{symbol.title_en}</h3>
                <p className="font-arabic text-xs text-text-muted" dir="rtl" lang="ar">{symbol.title_ar}</p>
                <p className="text-xs text-text-muted mt-2">{symbol.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">Effects When Stopping</h2>
        <ul className="space-y-2">
          {waqfData.stopping_effects.map((effect, i) => (
            <li key={i} className="text-sm text-text-muted flex gap-2">
              <span className="text-primary dark:text-primary-light shrink-0">-</span>
              {effect}
            </li>
          ))}
        </ul>
      </Card>

      <LessonNavigation
        prevHref="/learn/tafkheem-tarqeeq"
        prevLabel="Heavy & Light"
        onMarkComplete={() => markLessonComplete("waqf", "waqf-main")}
        isComplete={progress.lessonsCompleted.includes("waqf-main")}
      />
    </div>
  );
}
