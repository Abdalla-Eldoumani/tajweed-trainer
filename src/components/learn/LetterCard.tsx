"use client";

import { memo } from "react";
import { ArabicText } from "@/components/ui/ArabicText";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface LetterCardProps {
  arabic: string;
  nameEn: string;
  nameAr?: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
}

export const LetterCard = memo(function LetterCard({ arabic, nameEn, nameAr, description, selected, onClick }: LetterCardProps) {
  const { isAr } = useTranslation();
  const displayName = isAr && nameAr ? nameAr : nameEn;
  return (
    <Card
      hover={!!onClick}
      onClick={onClick}
      className={cn("text-center p-4", selected && "ring-2 ring-primary dark:ring-primary-light")}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Letter ${nameEn}`}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <ArabicText text={arabic} size="xl" className="block mb-1" />
      <p className="text-xs font-medium">{displayName}</p>
      {description && <p className="text-[10px] text-text-muted mt-1">{description}</p>}
    </Card>
  );
});

LetterCard.displayName = "LetterCard";
