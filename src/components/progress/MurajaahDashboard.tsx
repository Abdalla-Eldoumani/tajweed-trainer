"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useMemorization } from "@/hooks/useMemorization";
import { useMemorizationReviews } from "@/hooks/useMemorizationReviews";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { getNewVersesIntroducedToday } from "@/lib/storage";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { toArabicIndic } from "@/lib/utils";

// Today's revision dashboard on /progress: the honest uncapped due count (REV-03),
// the NEW / RECENT / CONSOLIDATED balance and the daily-new cap status (REV-01/02),
// and a CTA that scrolls to the ONE recall-review card (no second review
// instance — the id anchor lives on the existing mount). It reads the SAME
// composeToday the recall session snapshots, so overview and session never
// diverge. No verse text is rendered here (operational copy only). Gated on the
// hook's mounted flag so the store-derived UI matches the server's empty render.
export function MurajaahDashboard() {
  const { t, isAr } = useTranslation();
  const { memorized, mounted } = useMemorization();
  const { composeToday } = useMemorizationReviews();
  const { settings } = useSettings();

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // The composed daily queue: the honest due total plus the per-class breakdown
  // and the capped new-allowed count. Memoized on the memorized Set identity like
  // the recall session's own dueNow, so it recomputes through the change bus.
  const q = useMemo(() => composeToday(memorized), [composeToday, memorized]);

  // Store-derived UI must not render before mount (the server has no memorized
  // set); the /progress mount already gates on this, and gating here too keeps the
  // component honest if it is ever mounted elsewhere.
  if (!mounted) return null;

  const cap = settings.newVerseCap ?? 5;
  // Read after mount only (localStorage-backed), so the first client paint agrees
  // with the server. Side-effect-free read — a stale day returns 0 without writing.
  const introduced = getNewVersesIntroducedToday();

  // The due label is murajaah.dueCount with the number lifted out into the big
  // headline figure (like KhatmahCard's percent + label), so the count stays a
  // tabular red figure and the phrase reads as its caption in both EN and AR.
  const dueLabel = t("murajaah.dueCount").replace("{n}", "").trim();
  const introducingNew = t("murajaah.introducingNew").replace("{n}", num(q.newAllowed));
  const capStatus = t("murajaah.newCapStatus")
    .replace("{n}", num(introduced))
    .replace("{cap}", num(cap));

  // The three portions of the balanced plan. Bars share the --primary track (gold
  // stays the headline elsewhere on the page); each bar's share is of the honest
  // due total, guarded so a zero total never divides by zero.
  const barMax = Math.max(q.dueTotal, 1);
  const breakdown: { key: string; label: string; count: number }[] = [
    { key: "new", label: t("murajaah.newLabel"), count: q.counts.new },
    { key: "recent", label: t("murajaah.recentLabel"), count: q.counts.recent },
    { key: "consolidated", label: t("murajaah.consolidatedLabel"), count: q.counts.consolidated },
  ];

  const handleBegin = () => {
    document.getElementById("murajaah-review-anchor")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <Card>
      <h2 className="font-heading font-semibold text-h3">{t("murajaah.title")}</h2>
      <p className="mt-1 text-sm text-text-muted">{t("murajaah.description")}</p>

      {/* The honest due headline (REV-03): the uncapped due total as a big red
          figure, with the day's new-verse intake as the quiet second truth. */}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-heading text-display font-semibold leading-none tabular-nums text-red-600 dark:text-red-400">
          {num(q.dueTotal)}
        </span>
        <span className="text-body text-text-muted">{dueLabel}</span>
      </div>
      <p className="mt-1 text-sm text-text-muted tabular-nums">{introducingNew}</p>

      {/* The balanced breakdown (REV-01/02): new / recent / consolidated as slim
          shares of the due total. All due recent + consolidated are surfaced; only
          the new tail is capped in the session. */}
      <div className="mt-5 space-y-3">
        {breakdown.map(({ key, label, count }) => (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-micro font-medium uppercase tracking-wide text-text-muted">
                {label}
              </span>
              <span className="text-sm font-semibold tabular-nums">{num(count)}</span>
            </div>
            <ProgressBar value={count} max={barMax} label={`${label}: ${num(count)}`} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-text-muted tabular-nums">{capStatus}</p>

      {/* Begin scrolls to the one recall-review card via the id anchor — no second
          review instance. When nothing is due, a calm caught-up line replaces it. */}
      <div className="mt-5">
        {q.dueTotal > 0 ? (
          <Button onClick={handleBegin}>{t("murajaah.beginRevision")}</Button>
        ) : (
          <p className="text-sm text-text-muted">{t("murajaah.caughtUp")}</p>
        )}
      </div>
    </Card>
  );
}
