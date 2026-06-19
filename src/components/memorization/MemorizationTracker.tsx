"use client";

import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MedallionOrnament } from "@/components/ui/Ornament";
import { useMemorization } from "@/hooks/useMemorization";
import { useTranslation } from "@/lib/i18n";
import { memorizedPercent } from "@/lib/memorization-scope";
import { toArabicIndic } from "@/lib/utils";

// 6236 is the only hard-coded total in the tracker (the constant MAX_MEMORIZED
// total of the Quran). The percentage and the share bar derive from the store
// count, never from a re-declared denominator.
const TOTAL_VERSES = 6236;

interface MemorizationTrackerProps {
  // Plan 04 wires the bulk-entry surface here; until then the empty-state CTA is
  // a no-op placeholder so the button is present and labeled from this plan.
  onOpenBulk?: () => void;
}

// The headline of the memorization tracker: the big percentage of the Quran
// memorized with the exact count / 6236 beneath, plus a slim gold (no-glow)
// share bar. When nothing is memorized it shows an inviting empty state instead
// of a bare 0%. Both branches gate on the hook's `mounted` flag so SSR and the
// first client paint agree (store-derived UI never flashes a wrong count).
export function MemorizationTracker({ onOpenBulk }: MemorizationTrackerProps) {
  const { t, isAr } = useTranslation();
  const { count, mounted } = useMemorization();

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // Before mount and at zero the section reads as the empty state; this keeps the
  // server and first-paint DOM identical (count is 0 on the server) and turns the
  // bare-0% gap into a real invitation.
  if (!mounted || count === 0) {
    return (
      <section aria-labelledby="memorization-heading">
        <SectionHeading as="h2" className="mb-4">
          <span id="memorization-heading">{t("memorize.statsTitle")}</span>
        </SectionHeading>
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg-card p-6 sm:p-8 dark:bg-bg-card-dark">
          {/* One quiet ornament accent, never a busy band. Anchored to the
              far inline-end corner and clipped, sized small. */}
          <MedallionOrnament
            className="pointer-events-none absolute -top-6 end-[-1.5rem] h-28 w-28 opacity-20"
          />
          <div className="relative max-w-prose">
            <h3 className="font-heading text-h3 font-semibold">{t("memorize.emptyTitle")}</h3>
            <p className="mt-2 text-body text-text-muted">{t("memorize.emptyBody")}</p>
            <div className="mt-5">
              <Button variant="primary" onClick={onOpenBulk}>
                {t("memorize.bulkOpen")}
              </Button>
            </div>
            <p className="mt-4 text-small text-text-muted">{t("memorize.statsHelp")}</p>
          </div>
        </div>
      </section>
    );
  }

  const percent = memorizedPercent(count);
  // The accessible name for the gold bar restates both figures so the bar is not
  // a color-only signal.
  const barLabel = isAr
    ? `${toArabicIndic(percent)}% — ${toArabicIndic(count)} / ${toArabicIndic(TOTAL_VERSES)}`
    : `${percent}% — ${count} / ${TOTAL_VERSES}`;

  return (
    <section aria-labelledby="memorization-heading">
      <SectionHeading as="h2" className="mb-4">
        <span id="memorization-heading">{t("memorize.statsTitle")}</span>
      </SectionHeading>
      <div className="rounded-xl border border-border bg-bg-card p-6 sm:p-8 dark:bg-bg-card-dark">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-[2.5rem] font-semibold leading-[1.15] tabular-nums sm:text-[3rem]">
            {num(percent)}
          </span>
          {/* The unit sits inline-end, smaller and muted. */}
          <span className="text-h3 font-medium text-text-muted">%</span>
          <span className="ms-2 text-small text-text-muted">{t("memorize.percentOfQuran")}</span>
        </div>
        <p className="mt-1 text-small text-text-muted tabular-nums">
          {num(count)} / {num(TOTAL_VERSES)} &middot; {t("memorize.statsCount")}
        </p>
        {/* Slim gold share bar: gold fill on the --bg-subtle track, no glow,
            no gradient, no drop shadow (gold is the headline indicator only). */}
        <div className="mt-4">
          <ProgressBar value={count} max={TOTAL_VERSES} color="var(--gold)" label={barLabel} />
        </div>
      </div>
    </section>
  );
}
