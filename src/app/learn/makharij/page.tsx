"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { MakhrajDiagram } from "@/components/learn/MakhrajDiagram";
import { LetterGrid } from "@/components/learn/LetterGrid";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { useProgress } from "@/hooks/useProgress";
import makharijData from "@/data/content/makharij.json";

export default function MakharijPage() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("makharij");

  const activeRegion = makharijData.regions.find((r) => r.id === selectedRegion);

  const letterGroups = makharijData.regions.map((region) => {
    const letters = region.letters
      ? region.letters.map((l) => ({ arabic: l.arabic, name_en: l.name_en, condition: (l as { condition?: string }).condition }))
      : (region.sub_points ?? []).flatMap((sp) =>
          sp.letters.map((l) => ({
            arabic: l.arabic,
            name_en: l.name_en,
            condition: sp.title_en,
            note: (l as { note?: string }).note,
          }))
        );

    return { title: `${region.title_en} (${region.title_ar})`, letters };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{makharijData.title_en}</h1>
        <p className="font-arabic text-lg text-text-muted mt-1" dir="rtl" lang="ar">
          {makharijData.title_ar}
        </p>
        <p className="text-sm text-text-muted mt-3">{makharijData.introduction}</p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-4">Articulation Points Diagram</h2>
        <MakhrajDiagram selectedRegion={selectedRegion} onRegionSelect={setSelectedRegion} />
      </Card>

      {activeRegion && (
        <Card>
          <h3 className="font-heading font-semibold">{activeRegion.title_en}</h3>
          <p className="font-arabic text-sm text-text-muted" dir="rtl" lang="ar">{activeRegion.title_ar}</p>
          <p className="text-sm text-text-muted mt-2">{activeRegion.description}</p>
          <p className="text-xs text-text-muted mt-1">{activeRegion.points_count} articulation point(s)</p>

          {activeRegion.sub_points && (
            <div className="mt-4 space-y-3">
              {activeRegion.sub_points.map((sp) => (
                <div key={sp.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs font-medium mb-2">{sp.title_en}</p>
                  <div className="flex flex-wrap gap-2">
                    {sp.letters.map((l) => (
                      <div key={l.arabic + l.name_en} className="flex items-center gap-1.5">
                        <ArabicText text={l.arabic} size="md" />
                        <span className="text-xs text-text-muted">{l.name_en}</span>
                      </div>
                    ))}
                  </div>
                  {(sp as { note?: string }).note && <p className="text-[10px] text-text-muted mt-2 italic">{(sp as { note?: string }).note}</p>}
                </div>
              ))}
            </div>
          )}

          {activeRegion.letters && !activeRegion.sub_points && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeRegion.letters.map((l) => (
                <div key={l.arabic + l.name_en} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <ArabicText text={l.arabic} size="md" />
                  <span className="text-xs text-text-muted">{l.name_en}</span>
                  {(l as { condition?: string }).condition && <span className="text-[10px] text-text-muted">({(l as { condition?: string }).condition})</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div>
        <h2 className="font-heading font-semibold text-lg mb-4">All Letters by Region</h2>
        <LetterGrid groups={letterGroups} />
      </div>

      <Card className="text-center">
        <p className="text-sm text-text-muted">
          <strong>{makharijData.total_points}</strong> articulation points producing <strong>{makharijData.total_letters}</strong> letters
        </p>
      </Card>

      <LessonNavigation
        nextHref="/learn/noon-sakinah"
        nextLabel="Noon Sakinah"
        onMarkComplete={() => markLessonComplete("makharij", "makharij-main")}
        isComplete={progress.lessonsCompleted.includes("makharij-main")}
      />
    </div>
  );
}
