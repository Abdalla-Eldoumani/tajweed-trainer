"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { LessonNavigation } from "@/components/learn/LessonNavigation";
import { LessonProgress } from "@/components/learn/LessonProgress";
import { LockedModuleScreen } from "@/components/learn/LockedModuleScreen";
import { useModuleLock } from "@/hooks/useModuleLock";
import LearnLoading from "../loading";
import { useTranslation } from "@/lib/i18n";

const MakhrajDiagram = dynamic(
  () => import("@/components/learn/MakhrajDiagram").then((mod) => ({ default: mod.MakhrajDiagram })),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-bg-subtle dark:bg-bg-subtle-dark rounded-xl animate-pulse" />,
  }
);

const LetterGrid = dynamic(
  () => import("@/components/learn/LetterGrid").then((mod) => ({ default: mod.LetterGrid })),
  {
    ssr: false,
    loading: () => <div className="h-48 bg-bg-subtle dark:bg-bg-subtle-dark rounded-xl animate-pulse" />,
  }
);
import { useProgress } from "@/hooks/useProgress";
import makharijData from "@/data/content/makharij.json";

const SECTIONS = ["makharij-overview", ...makharijData.regions.map((r) => r.id)];

export default function MakharijPage() {
  const { locked, mounted, prereqId, prereqTitleEn, prereqTitleAr } = useModuleLock("makharij");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const { markLessonComplete, moduleProgress } = useProgress();
  const progress = moduleProgress("makharij");
  const { t, isAr } = useTranslation();

  // Render the loading skeleton during the brief hydration window so a locked
  // URL never flashes module content before useModuleLock resolves.
  if (!mounted) return <LearnLoading />;
  if (locked && prereqId && prereqTitleEn && prereqTitleAr) {
    return (
      <LockedModuleScreen
        moduleTitleEn={makharijData.title_en}
        moduleTitleAr={makharijData.title_ar}
        prereqId={prereqId}
        prereqTitleEn={prereqTitleEn}
        prereqTitleAr={prereqTitleAr}
      />
    );
  }

  const activeRegion = makharijData.regions.find((r) => r.id === selectedRegion);

  const letterGroups = makharijData.regions.map((region) => {
    const letters = region.letters
      ? region.letters.map((l) => ({
          arabic: l.arabic,
          name_en: l.name_en,
          name_ar: (l as { name_ar?: string }).name_ar,
          condition: isAr ? ((l as { condition_ar?: string }).condition_ar ?? (l as { condition?: string }).condition) : (l as { condition?: string }).condition,
        }))
      : (region.sub_points ?? []).flatMap((sp) =>
          sp.letters.map((l) => ({
            arabic: l.arabic,
            name_en: l.name_en,
            name_ar: (l as { name_ar?: string }).name_ar,
            condition: isAr ? (sp.title_ar ?? sp.title_en) : sp.title_en,
            note: isAr ? ((l as { note_ar?: string }).note_ar ?? (l as { note?: string }).note) : (l as { note?: string }).note,
          }))
        );

    return { title: isAr ? region.title_ar : `${region.title_en} (${region.title_ar})`, letters };
  });

  return (
    <div className="space-y-8">
      <div id="makharij-overview" className="scroll-mt-20">
        <SectionBanner
          title={isAr ? makharijData.title_ar : makharijData.title_en}
          subtitle={isAr ? makharijData.title_en : makharijData.title_ar}
        />
        <p className="text-small text-text-muted mt-4">
          {isAr ? (makharijData.introduction_ar ?? makharijData.introduction) : makharijData.introduction}
        </p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-h2 mb-4">{t("makharij.diagram")}</h2>
        <MakhrajDiagram selectedRegion={selectedRegion} onRegionSelect={setSelectedRegion} />
      </Card>

      {activeRegion && (
        <Card>
          <h3 className="font-heading font-semibold text-h3">{isAr ? activeRegion.title_ar : activeRegion.title_en}</h3>
          {!isAr && <ArabicText text={activeRegion.title_ar} size="sm" className="text-text-muted" />}
          <p className="text-small text-text-muted mt-2">{isAr && (activeRegion as { description_ar?: string }).description_ar ? (activeRegion as { description_ar?: string }).description_ar : activeRegion.description}</p>
          <p className="text-micro text-text-muted mt-1">{activeRegion.points_count} {t("makharij.articulationPoints")}</p>

          {activeRegion.sub_points && (
            <div className="mt-4 space-y-3">
              {activeRegion.sub_points.map((sp) => (
                <div key={sp.id} className="p-3 rounded-lg bg-bg-subtle dark:bg-bg-subtle-dark">
                  <p className="text-micro font-medium mb-2">{isAr && sp.title_ar ? sp.title_ar : sp.title_en}</p>
                  <div className="flex flex-wrap gap-2">
                    {sp.letters.map((l) => (
                      <div key={l.arabic + l.name_en} className="flex items-center gap-1.5">
                        <ArabicText text={l.arabic} size="md" />
                        <span className="text-micro text-text-muted">{isAr && (l as { name_ar?: string }).name_ar ? (l as { name_ar?: string }).name_ar : l.name_en}</span>
                      </div>
                    ))}
                  </div>
                  {(sp as { note?: string; note_ar?: string }).note && <p className="text-micro text-text-muted mt-2 italic">{isAr && (sp as { note_ar?: string }).note_ar ? (sp as { note_ar?: string }).note_ar : (sp as { note?: string }).note}</p>}
                </div>
              ))}
            </div>
          )}

          {activeRegion.letters && !activeRegion.sub_points && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeRegion.letters.map((l) => (
                <div key={l.arabic + l.name_en} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-subtle dark:bg-bg-subtle-dark">
                  <ArabicText text={l.arabic} size="md" />
                  <span className="text-micro text-text-muted">{isAr && (l as { name_ar?: string }).name_ar ? (l as { name_ar?: string }).name_ar : l.name_en}</span>
                  {(l as { condition?: string; condition_ar?: string }).condition && <span className="text-micro text-text-muted">({isAr && (l as { condition_ar?: string }).condition_ar ? (l as { condition_ar?: string }).condition_ar : (l as { condition?: string }).condition})</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div>
        <h2 className="font-heading font-semibold text-h2 mb-4">{t("makharij.allLetters")}</h2>
        <LetterGrid groups={letterGroups} />
      </div>

      <Card variant="ornate" className="text-center">
        <p className="text-small text-text-muted">
          <strong>{makharijData.total_points}</strong> {t("makharij.totalPoints")}{" "}
          · <strong>{makharijData.total_letters}</strong> {t("makharij.totalLetters")}
        </p>
      </Card>

      <LessonNavigation
        nextHref="/learn/noon-sakinah"
        nextLabel={{ en: "Noon Sakinah", ar: "النون الساكنة والتنوين" }}
        onMarkComplete={() => markLessonComplete("makharij", "makharij-main")}
        isComplete={progress.lessonsCompleted.includes("makharij-main")}
        practiceModuleId="makharij"
      />

      <LessonProgress moduleId="makharij" sections={SECTIONS} />
    </div>
  );
}
