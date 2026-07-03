"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useProgress } from "@/hooks/useProgress";
import { setJournalGoals } from "@/lib/storage";
import { useTranslation } from "@/lib/i18n";
import { toArabicIndic } from "@/lib/utils";

// A brand-new day has no stored entry; the all-zero default matches the storage
// helper's read-or-create shape and the server's empty snapshot.
const ZERO_ENTRY = { memorizeGoal: 0, reviseGoal: 0, memorized: 0, revised: 0 };

// The goal inputs echo the khatmah setup field look (card ground, gold hairline,
// 44px touch floor) so they match the rest of /progress.
const FIELD_CLASS =
  "w-20 text-sm bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px] tabular-nums";

// The per-day session journal (EXAM-03): set today's memorize/revise goals and
// watch today's memorized/revised tallies climb toward them. Reads today's entry
// through the useProgress change-bus snapshot so it re-renders live as the
// memorize-add tally (11-01) and the revise tally (11-02) accrue. Writes goals
// through setJournalGoals (SET semantics; a re-save overwrites). "Rides the
// backup" by living on TajweedProgress — no separate export path. Renders no
// verse text (the learner's own counts only), so no TajweedText / dangerous HTML.
export function SessionJournal() {
  const { progress } = useProgress();
  const { t, isAr } = useTranslation();

  // Store-derived UI gates on a mounted flag so the first client paint matches
  // the server's empty snapshot (all-zero), mirroring the RevisionStreakCounter
  // idiom in this directory.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The day boundary is the app-wide en-CA local date (matches the storage
  // helpers and the streak math), so the entry read and the goal write name the
  // same day across timezones.
  const today = new Date().toLocaleDateString("en-CA");

  const entry = (mounted && progress.sessionJournal?.[today]) || ZERO_ENTRY;

  // The goal inputs seed from today's stored goals and re-seed whenever the
  // stored goals change (a re-save overwrites, matching setJournalGoals). Kept as
  // strings so the field can be cleared while typing. Seeded by adjusting state
  // during render (the React-blessed alternative to a sync effect) keyed on the
  // stored goals, so the inputs track the store without a cascading effect and
  // the learner's in-progress typing is never clobbered mid-edit.
  const [memorizeInput, setMemorizeInput] = useState("0");
  const [reviseInput, setReviseInput] = useState("0");
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const goalKey = `${entry.memorizeGoal}:${entry.reviseGoal}`;
  if (seededFor !== goalKey) {
    setSeededFor(goalKey);
    setMemorizeInput(String(entry.memorizeGoal));
    setReviseInput(String(entry.reviseGoal));
  }

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // A convenience UI clamp to a sane daily range; setJournalGoals re-clamps to
  // [0, 100000] and validates the date, so the funnel stays the trust boundary.
  const clampGoal = (s: string) => Math.max(0, Math.min(100, Math.floor(Number(s) || 0)));

  const handleSave = () => {
    setJournalGoals(today, {
      memorizeGoal: clampGoal(memorizeInput),
      reviseGoal: clampGoal(reviseInput),
    });
  };

  const hasGoals = entry.memorizeGoal > 0 || entry.reviseGoal > 0;

  const summary = t("journal.summary")
    .replace("{memorized}", num(entry.memorized))
    .replace("{memorizeGoal}", num(entry.memorizeGoal))
    .replace("{revised}", num(entry.revised))
    .replace("{reviseGoal}", num(entry.reviseGoal));

  // Each bar restates both figures in its accessible name so it is not a
  // color-only signal (mirrors the KhatmahCard bar label).
  const barLabel = (label: string, value: number, goal: number) =>
    `${label}: ${num(value)} / ${num(goal)}`;

  return (
    <Card>
      <section role="region" aria-label={t("journal.title")}>
        <h2 className="font-heading font-semibold text-sm mb-1">{t("journal.title")}</h2>
        <p className="text-xs text-text-muted mb-4">{t("journal.description")}</p>

        {/* Set today's goals: two small number inputs + Save. Goals are SET (a
            re-save overwrites), matching the storage helper. */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
            {t("journal.memorizeGoal")}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={memorizeInput}
              onChange={(e) => setMemorizeInput(e.target.value)}
              className={FIELD_CLASS}
              aria-label={t("journal.memorizeGoal")}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
            {t("journal.reviseGoal")}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={reviseInput}
              onChange={(e) => setReviseInput(e.target.value)}
              className={FIELD_CLASS}
              aria-label={t("journal.reviseGoal")}
            />
          </label>
          <Button variant="primary" size="sm" onClick={handleSave}>
            {t("journal.save")}
          </Button>
        </div>

        {hasGoals ? (
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">{t("journal.memorizedLabel")}</span>
                <span className="tabular-nums">
                  {num(entry.memorized)} / {num(entry.memorizeGoal)}
                </span>
              </div>
              <ProgressBar
                value={entry.memorized}
                max={Math.max(entry.memorizeGoal, entry.memorized, 1)}
                label={barLabel(t("journal.memorizedLabel"), entry.memorized, entry.memorizeGoal)}
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">{t("journal.revisedLabel")}</span>
                <span className="tabular-nums">
                  {num(entry.revised)} / {num(entry.reviseGoal)}
                </span>
              </div>
              <ProgressBar
                value={entry.revised}
                max={Math.max(entry.reviseGoal, entry.revised, 1)}
                label={barLabel(t("journal.revisedLabel"), entry.revised, entry.reviseGoal)}
              />
            </div>
            <p className="text-xs text-text-muted">{summary}</p>
          </div>
        ) : (
          <p className="mt-5 text-xs text-text-muted">{t("journal.noGoals")}</p>
        )}
      </section>
    </Card>
  );
}
