"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface MakhrajDiagramProps {
  onRegionSelect?: (regionId: string) => void;
  selectedRegion?: string | null;
}

// x and y place the marker; lx and ly place the start of its label. Labels are
// 5.6 units (6.4 for Arabic), which keeps them above 13px down to a 250px-wide
// diagram. The lips label sits above its marker instead of beside it: beside it
// the longer name would run into the Al-Jawf marker.
const REGIONS = [
  { id: "al-jawf", label: "Al-Jawf", labelAr: "الجوف", description: "Empty Space / Oral Cavity", y: 42, x: 50, lx: 54.5, ly: 43.7 },
  { id: "al-halq", label: "Al-Halq", labelAr: "الحلق", description: "The Throat", y: 72, x: 62, lx: 66.5, ly: 73.7 },
  { id: "al-lisan", label: "Al-Lisan", labelAr: "اللسان", description: "The Tongue", y: 58, x: 38, lx: 42.5, ly: 59.7 },
  { id: "ash-shafataan", label: "Ash-Shafataan", labelAr: "الشفتان", description: "The Two Lips", y: 45, x: 16, lx: 9, ly: 36.5 },
  { id: "al-khayshoom", label: "Al-Khayshoom", labelAr: "الخيشوم", description: "The Nasal Cavity", y: 22, x: 38, lx: 42.5, ly: 23.7 },
];

export function MakhrajDiagram({ onRegionSelect, selectedRegion }: MakhrajDiagramProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const { isAr } = useTranslation();

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Decorative visual layer; the labelled button grid below is the
          accessible control, so the svg markers are mouse affordances only. */}
      <svg viewBox="0 5 100 87" className="w-full h-auto" style={{ direction: "ltr" }} aria-hidden="true">
        {/* Head outline - simplified cross-section */}
        <path
          d="M 15,10 C 10,10 5,20 5,35 C 5,50 8,60 12,70 C 16,80 18,85 20,90 L 80,90 C 82,85 84,80 85,75 C 88,65 90,55 90,45 C 90,30 85,15 70,10 C 60,7 40,7 15,10 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-border"
        />

        {/* Mouth opening */}
        <path
          d="M 10,45 C 12,42 15,40 18,42 C 20,44 18,48 15,48 C 12,48 10,47 10,45"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          className="text-text-muted opacity-70"
        />

        {/* Interactive regions */}
        {REGIONS.map((region) => {
          const isSelected = selectedRegion === region.id;
          const isHovered = hoveredRegion === region.id;

          return (
            <g
              key={region.id}
              className="cursor-pointer"
              onClick={() => onRegionSelect?.(region.id)}
              onMouseEnter={() => setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <circle
                cx={region.x}
                cy={region.y}
                r={isSelected || isHovered ? 3.2 : 2.4}
                className={cn(
                  "transition-all",
                  isSelected
                    ? "fill-primary/30 stroke-primary dark:fill-primary-light/30 dark:stroke-primary-light"
                    : isHovered
                    ? "fill-primary/10 stroke-primary/60"
                    : "fill-gold/40 stroke-gold-deep"
                )}
                strokeWidth={isSelected ? "0.8" : "0.5"}
              />
              <text
                x={region.lx}
                y={region.ly}
                lang={isAr ? "ar" : "en"}
                className={cn(
                  "fill-current select-none [paint-order:stroke] stroke-bg stroke-[0.9]",
                  isAr ? "font-arabic text-[6.4px]" : "font-medium text-[5.6px]",
                  isSelected && "fill-primary dark:fill-primary-light font-bold"
                )}
              >
                {isAr ? region.labelAr : region.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Region labels below */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
        {REGIONS.map((region) => (
          <button
            key={region.id}
            onClick={() => onRegionSelect?.(region.id)}
            className={cn(
              "text-left px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px]",
              selectedRegion === region.id
                ? "bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light"
                : "hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark text-text-muted"
            )}
          >
            {isAr ? (
              <>
                <p className="font-arabic text-base" dir="rtl" lang="ar">{region.labelAr}</p>
                <p className="text-xs">{region.label}</p>
              </>
            ) : (
              <>
                <p className="font-medium">{region.label}</p>
                <p className="font-arabic text-sm" dir="rtl" lang="ar">{region.labelAr}</p>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
