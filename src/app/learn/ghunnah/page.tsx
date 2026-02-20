"use client";

import { RuleCard } from "@/components/learn/RuleCard";
import { Card } from "@/components/ui/Card";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
import ghunnahData from "@/data/content/ghunnah.json";

export default function GhunnahPage() {
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("ghunnah");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{ghunnahData.title_en}</h1>
        <p className="font-arabic text-lg text-text-muted mt-1" dir="rtl" lang="ar">
          {ghunnahData.title_ar}
        </p>
        <p className="text-sm text-text-muted mt-3">{ghunnahData.introduction}</p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-2">Definition</h2>
        <p className="text-sm text-text-muted">{ghunnahData.definition}</p>
        <p className="text-sm font-medium mt-2 text-primary dark:text-primary-light">
          Duration: {ghunnahData.duration}
        </p>
      </Card>

      <div className="space-y-4">
        {ghunnahData.rules.map((rule) => (
          <RuleCard
            key={rule.id}
            titleEn={rule.title_en}
            titleAr={rule.title_ar}
            description={rule.description}
            examples={rule.examples}
            color="#169200"
            defaultExpanded
          />
        ))}
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">Ghunnah Prominence Ranking</h2>
        <div className="space-y-2">
          {ghunnahData.ghunnah_prominence_ranking.map((item) => (
            <div key={item.rank} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light flex items-center justify-center text-xs font-bold">
                {item.rank}
              </span>
              <div className="flex-1">
                <span className="font-medium">{item.context}</span>
                <span className="text-text-muted ml-2">({item.prominence})</span>
              </div>
              <span className="text-xs text-text-muted">{item.beats} beats</span>
            </div>
          ))}
        </div>
      </Card>

      {ghunnahData.common_mistakes.length > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-red-600 dark:text-red-400 mb-3">Common Mistakes</h2>
          <ul className="space-y-2">
            {ghunnahData.common_mistakes.map((mistake, i) => (
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
        prevLabel="Meem Sakinah"
        nextHref="/learn/qalqalah"
        nextLabel="Qalqalah"
        onMarkComplete={() => markLessonComplete("ghunnah", "ghunnah-main")}
        isComplete={progress.lessonsCompleted.includes("ghunnah-main")}
      />
    </div>
  );
}
