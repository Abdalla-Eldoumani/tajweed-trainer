"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArabicText } from "@/components/ui/ArabicText";
import { useTranslation } from "@/lib/i18n";

interface LockedModuleScreenProps {
  moduleTitleEn: string;
  moduleTitleAr: string;
  prereqId: string;
  prereqTitleEn: string;
  prereqTitleAr: string;
}

const LockIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function LockedModuleScreen({
  moduleTitleEn,
  moduleTitleAr,
  prereqId,
  prereqTitleEn,
  prereqTitleAr,
}: LockedModuleScreenProps) {
  const { t, isAr } = useTranslation();
  const moduleTitle = isAr ? moduleTitleAr : moduleTitleEn;
  const prereqTitle = isAr ? prereqTitleAr : prereqTitleEn;

  return (
    <div className="max-w-md mx-auto">
      <Card variant="ornate" className="text-center space-y-4">
        <div className="flex justify-center text-gold-dark dark:text-gold-light">
          <LockIcon />
        </div>

        <div>
          <h1 className="font-heading text-xl font-bold">{moduleTitle}</h1>
          {isAr ? (
            <p className="text-xs text-text-muted mt-1">{moduleTitleEn}</p>
          ) : (
            <ArabicText text={moduleTitleAr} size="sm" className="text-text-muted mt-1" />
          )}
        </div>

        <p className="text-sm text-text-muted">{t("learn.locked.body")}</p>

        <div className="p-3 rounded-lg bg-gold-light/10 dark:bg-gold-dark/10 border border-gold-light/30 dark:border-gold-dark/20">
          <p className="text-xs font-semibold text-text-muted mb-1">{t("learn.prerequisite")}</p>
          <p className="text-sm font-medium">{prereqTitle}</p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link href={`/learn/${prereqId}`}>
            <Button size="md" className="w-full">
              {t("learn.locked.startPrereq")}
            </Button>
          </Link>
          <Link
            href="/learn"
            className="text-xs text-text-muted hover:text-text dark:hover:text-text-dark transition-colors min-h-[44px] inline-flex items-center justify-center"
          >
            {t("learn.locked.backToList")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
