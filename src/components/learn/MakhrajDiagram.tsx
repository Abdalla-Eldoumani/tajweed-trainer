"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface MakhrajDiagramProps {
  onRegionSelect?: (regionId: string) => void;
  selectedRegion?: string | null;
}

const REGIONS = [
  { id: "al-jawf", label: "Al-Jawf", labelAr: "الجوف", description: "Empty Space / Oral Cavity", y: 45, x: 50 },
  { id: "al-halq", label: "Al-Halq", labelAr: "الحلق", description: "The Throat", y: 70, x: 35 },
  { id: "al-lisan", label: "Al-Lisan", labelAr: "اللسان", description: "The Tongue", y: 40, x: 45 },
  { id: "ash-shafataan", label: "Ash-Shafataan", labelAr: "الشفتان", description: "The Two Lips", y: 30, x: 15 },
  { id: "al-khayshoom", label: "Al-Khayshoom", labelAr: "الخيشوم", description: "The Nasal Cavity", y: 15, x: 40 },
];

export function MakhrajDiagram({ onRegionSelect, selectedRegion }: MakhrajDiagramProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-auto" role="img" aria-label="Makhraj articulation points diagram">
        {/* Head outline - simplified cross-section */}
        <path
          d="M 15,10 C 10,10 5,20 5,35 C 5,50 8,60 12,70 C 16,80 18,85 20,90 L 80,90 C 82,85 84,80 85,75 C 88,65 90,55 90,45 C 90,30 85,15 70,10 C 60,7 40,7 15,10 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-gray-300 dark:text-gray-600"
        />

        {/* Mouth opening */}
        <path
          d="M 10,45 C 12,42 15,40 18,42 C 20,44 18,48 15,48 C 12,48 10,47 10,45"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          className="text-gray-400"
        />

        {/* Interactive regions */}
        {REGIONS.map((region) => {
          const isSelected = selectedRegion === region.id;
          const isHovered = hoveredRegion === region.id;

          return (
            <g key={region.id}>
              <circle
                cx={region.x}
                cy={region.y}
                r={isSelected || isHovered ? 8 : 6}
                className={cn(
                  "cursor-pointer transition-all",
                  isSelected
                    ? "fill-primary/30 stroke-primary dark:fill-primary-light/30 dark:stroke-primary-light"
                    : isHovered
                    ? "fill-primary/10 stroke-primary/60"
                    : "fill-gray-100/50 stroke-gray-400 dark:fill-gray-700/50 dark:stroke-gray-500"
                )}
                strokeWidth={isSelected ? "1" : "0.5"}
                onClick={() => onRegionSelect?.(region.id)}
                onMouseEnter={() => setHoveredRegion(region.id)}
                onMouseLeave={() => setHoveredRegion(null)}
                role="button"
                tabIndex={0}
                aria-label={`${region.label} - ${region.description}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRegionSelect?.(region.id);
                  }
                }}
              />
              <text
                x={region.x}
                y={region.y + 0.8}
                textAnchor="middle"
                className="text-[3px] fill-current font-medium pointer-events-none select-none"
              >
                {region.label.split(" ")[0]}
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
              "text-left px-3 py-2 rounded-lg text-xs transition-colors",
              selectedRegion === region.id
                ? "bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-text-muted"
            )}
          >
            <p className="font-medium">{region.label}</p>
            <p className="font-arabic text-[10px]" dir="rtl" lang="ar">{region.labelAr}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
