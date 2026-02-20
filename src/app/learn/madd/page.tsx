"use client";

import { RuleCard } from "@/components/learn/RuleCard";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
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
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("madd");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{maddData.title_en}</h1>
        <p className="font-arabic text-lg text-text-muted mt-1" dir="rtl" lang="ar">
          {maddData.title_ar}
        </p>
        <p className="text-sm text-text-muted mt-3">{maddData.introduction}</p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">Madd Letters</h2>
        <div className="flex flex-wrap justify-center gap-6">
          {maddData.madd_letters.map((letter) => (
            <div key={letter.arabic} className="text-center">
              <ArabicText text={letter.arabic} size="xl" className="block" />
              <p className="text-xs font-medium mt-1">{letter.name_en}</p>
              <p className="text-[10px] text-text-muted">{letter.condition}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {maddData.types.map((type) => (
          <RuleCard
            key={type.id}
            titleEn={`${type.title_en} (${type.beats} beats)`}
            titleAr={type.title_ar}
            description={type.description}
            examples={type.examples}
            color={MADD_COLORS[type.id] ?? "#E06050"}
          />
        ))}
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">Summary Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-semibold">Type</th>
                <th className="text-center py-2 pr-4 font-semibold">Beats</th>
                <th className="text-left py-2 font-semibold">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {Object.entries(maddData.summary_table).map(([key, val]) => (
                <tr key={key}>
                  <td className="py-2 pr-4 font-medium">{val.type}</td>
                  <td className="py-2 pr-4 text-center">{val.beats}</td>
                  <td className="py-2 text-text-muted">{val.trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <LessonNavigation
        prevHref="/learn/qalqalah"
        prevLabel="Qalqalah"
        nextHref="/learn/laam-raa"
        nextLabel="Laam & Raa"
        onMarkComplete={() => markLessonComplete("madd", "madd-main")}
        isComplete={progress.lessonsCompleted.includes("madd-main")}
      />
    </div>
  );
}
