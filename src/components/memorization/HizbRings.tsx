"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useTranslation } from "@/lib/i18n";
import { useMemorization } from "@/hooks/useMemorization";
import { countInScope, memorizedPercent, versesForHizb, versesForRub } from "@/lib/memorization-scope";
import { TOTAL_HIZB, TOTAL_RUB } from "@/lib/navigation";
import { toArabicIndic } from "@/lib/utils";

// Coverage rings for the 60 hizb and 240 rub' al-hizb (PROG-01). Each ring is a
// circular SVG whose arc encodes how much of that scope's verses are memorized:
// count / total of the scope's enumerated verseKeys, derived from the memorized
// set (never stored). versesForHizb/Rub(n).length is always > 0, so a new learner
// yields 0 for every ring with no divide-by-zero — and the whole surface gates on
// `mounted` ONLY (not the memorized count) so those empty rings still render.
// Manuscript tokens only (--primary / --gold arc on a --bg-subtle track); renders
// no verse text (only scope numbers and percentages).

interface RingDatum {
  n: number;
  count: number;
  total: number;
  pct: number;
}

// Ring geometry: the arc is the fraction of the circumference left un-offset, so
// dashoffset runs from the full circumference (0%) down to 0 (100%).
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CoverageRing({
  centerText,
  pctText,
  pct,
  ariaLabel,
}: {
  centerText: string;
  pctText: string;
  pct: number;
  ariaLabel: string;
}) {
  const offset = CIRCUMFERENCE * (1 - Math.min(pct, 100) / 100);
  // A completed scope gets the gold-leaf accent; everything in progress is lapis
  // ink (both flip per-theme via the CSS var, like ProgressBar).
  const arcColor = pct >= 100 ? "var(--gold)" : "var(--primary)";
  return (
    <li className="flex flex-col items-center gap-1" aria-label={ariaLabel}>
      <span className="relative inline-flex h-11 w-11 items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90" aria-hidden="true">
          {/* Track: a quiet --bg-subtle ring behind the arc. */}
          <circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="4" style={{ stroke: "var(--bg-subtle)" }} />
          {/* Arc: the memorized fraction of the circumference. */}
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ stroke: arcColor }}
            className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
          />
        </svg>
        {/* The scope number, centered inside the ring (not rotated with the SVG). */}
        <span className="absolute text-micro font-medium tabular-nums">{centerText}</span>
      </span>
      <span className="text-micro text-text-muted tabular-nums">{pctText}</span>
    </li>
  );
}

export function HizbRings() {
  const { t, isAr } = useTranslation();
  const { memorized, mounted } = useMemorization();
  const [showRub, setShowRub] = useState(false);

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // One pass over all 60 + 240 scopes, recomputed only when the memorized Set
  // identity changes (the MemorizationBreakdown precedent; T-12-03: not per render
  // and not per verse). total is always > 0, so a new learner reads 0 everywhere.
  const { hizbRings, rubRings } = useMemo(() => {
    const hizb: RingDatum[] = Array.from({ length: TOTAL_HIZB }, (_, i) => {
      const n = i + 1;
      const verses = versesForHizb(n);
      const count = countInScope(memorized, verses);
      const total = verses.length;
      // Honest edges (memorization-scope precedent): a single memorized verse in a
      // large hizb (juz 29-30 run 225-288 verses) never rounds down to 0%, and
      // all-but-one never rounds up to a "completed" 100% — only a full scope is 100%.
      return { n, count, total, pct: memorizedPercent(count, total) };
    });
    const rub: RingDatum[] = Array.from({ length: TOTAL_RUB }, (_, i) => {
      const n = i + 1;
      const verses = versesForRub(n);
      const count = countInScope(memorized, verses);
      const total = verses.length;
      return { n, count, total, pct: memorizedPercent(count, total) };
    });
    return { hizbRings: hizb, rubRings: rub };
  }, [memorized]);

  // Gate on mount ONLY so the empty rings still render for a new learner (PROG-01
  // criterion 1); the server paint is the empty set, and this matches it.
  if (!mounted) return null;

  const ringLabel = (key: "hizb.ringLabel" | "hizb.rubRingLabel", r: RingDatum) =>
    t(key)
      .replace("{n}", num(r.n))
      .replace("{pct}", num(r.pct))
      .replace("{count}", num(r.count))
      .replace("{total}", num(r.total));

  return (
    <Card>
      <section role="region" aria-label={t("hizb.title")} className="space-y-4">
        <div>
          <SectionHeading as="h3">{t("hizb.title")}</SectionHeading>
          <p className="mt-1 text-small text-text-muted">{t("hizb.help")}</p>
        </div>

        <ul className="grid grid-cols-5 gap-3 sm:grid-cols-8 md:grid-cols-10">
          {hizbRings.map((r) => (
            <CoverageRing
              key={r.n}
              centerText={num(r.n)}
              pctText={`${num(r.pct)}%`}
              pct={r.pct}
              ariaLabel={ringLabel("hizb.ringLabel", r)}
            />
          ))}
        </ul>

        <div>
          <button
            type="button"
            onClick={() => setShowRub((v) => !v)}
            aria-expanded={showRub}
            aria-controls="hizb-rub-grid"
            className="min-h-[44px] text-small font-medium text-primary underline-offset-4 hover:underline dark:text-primary-light"
          >
            {showRub ? t("hizb.hideRub") : t("hizb.showRub")}
          </button>
          {showRub && (
            <ul id="hizb-rub-grid" className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-10 md:grid-cols-12">
              {rubRings.map((r) => (
                <CoverageRing
                  key={r.n}
                  centerText={num(r.n)}
                  pctText={`${num(r.pct)}%`}
                  pct={r.pct}
                  ariaLabel={ringLabel("hizb.rubRingLabel", r)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </Card>
  );
}
