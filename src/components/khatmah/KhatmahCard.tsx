"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MedallionOrnament } from "@/components/ui/Ornament";
import { useKhatmah } from "@/hooks/useKhatmah";
import { useTranslation } from "@/lib/i18n";
import { computeKhatmahPace, targetDateForDuration } from "@/lib/khatmah";
import { toArabicIndic } from "@/lib/utils";
import type { KhatmahPlan } from "@/lib/types";

// Today as a local YYYY-MM-DD, computed at render (app code owns the clock, the
// pace lib stays deterministic). "en-CA" yields ISO date order, matching the
// streak helper's convention.
function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

const DURATIONS = [30, 60, 90] as const;
const DURATION_KEY: Record<(typeof DURATIONS)[number], string> = {
  30: "khatmah.days30",
  60: "khatmah.days60",
  90: "khatmah.days90",
};

// Reader's select look, echoed from the bulk-entry surface so the date input
// matches the rest of the app (card ground, gold hairline, 8px radius, 44px floor).
const FIELD_CLASS =
  "text-small bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]";

// A calm, opt-in Quran-completion planner on /progress. No reminders and no
// blocking: when there is no plan it shows an inviting empty state; with a plan
// it shows the headline percent, the daily goal, and a quiet ahead/behind line,
// all derived from the pace lib over the reader position the app already records.
// Gated on the hook's `mounted` flag so the store-derived UI never flashes before
// hydration (server snapshot has no plan and no reader page).
export function KhatmahCard() {
  const { t, isAr } = useTranslation();
  const { plan, currentPage, save, clear, mounted } = useKhatmah();

  const [editing, setEditing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // Before mount the section reads as the empty state so the server and first
  // client paint match (no plan on the server).
  if (!mounted) {
    return <KhatmahEmpty onStart={() => undefined} />;
  }

  if (!plan && !editing) {
    return <KhatmahEmpty onStart={() => setEditing(true)} />;
  }

  if (editing) {
    return (
      <KhatmahSetup
        existing={plan}
        defaultStartPage={currentPage}
        onCancel={() => setEditing(false)}
        onSave={(next) => {
          save(next);
          setEditing(false);
        }}
      />
    );
  }

  // plan is non-null here.
  const pace = computeKhatmahPace(plan!, currentPage, todayIso());

  // The reader's clamped position out of 604, so the headline percent, the gold
  // bar, and the "X of 604" line all agree on whole-Quran position (pace.pagesRead
  // is plan-relative — counted from startPage — and is used for the pace math only,
  // not the headline display).
  const pageOf604 = 604 - pace.pagesRemaining;

  // The accessible name for the gold bar restates both figures so the bar is not
  // a color-only signal.
  const barLabel = isAr
    ? `${toArabicIndic(pace.percentComplete)}% — ${toArabicIndic(pageOf604)} / ${toArabicIndic(604)}`
    : `${pace.percentComplete}% — ${pageOf604} / 604`;

  // The single quiet status line. Completion is celebrated calmly; otherwise a
  // due-today / ahead / behind / on-track read, derived (never nagged).
  const statusLine = (() => {
    if (pace.isComplete) {
      return { text: t("khatmah.complete"), tone: "accent" as const };
    }
    if (pace.daysRemaining === 0) {
      return { text: t("khatmah.dueToday"), tone: "muted" as const };
    }
    const wholeDays = Math.round(Math.abs(pace.daysAhead));
    if (wholeDays < 1) {
      return { text: t("khatmah.onTrack"), tone: "muted" as const };
    }
    if (pace.daysAhead > 0) {
      return { text: t("khatmah.aheadDays").replace("{n}", num(wholeDays)), tone: "primary" as const };
    }
    return { text: t("khatmah.behindDays").replace("{n}", num(wholeDays)), tone: "muted" as const };
  })();

  const toneClass =
    statusLine.tone === "primary"
      ? "text-primary dark:text-primary-light"
      : statusLine.tone === "accent"
      ? "text-accent"
      : "text-text-muted";

  return (
    <section aria-labelledby="khatmah-heading">
      <SectionHeading as="h2" className="mb-4">
        <span id="khatmah-heading">{t("khatmah.title")}</span>
      </SectionHeading>
      <div className="rounded-xl border border-border bg-bg-card p-6 sm:p-8 dark:bg-bg-card-dark">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-[2.5rem] font-semibold leading-[1.15] tabular-nums sm:text-[3rem]">
            {num(pace.percentComplete)}
          </span>
          <span className="text-h3 font-medium text-text-muted">%</span>
          <span className="ms-2 text-small text-text-muted">{t("khatmah.percentLabel")}</span>
        </div>
        <p className="mt-1 text-small text-text-muted tabular-nums">
          {t("khatmah.pagesRead")
            .replace("{read}", num(pageOf604))
            .replace("{total}", num(604))}
        </p>
        {/* Slim gold share bar: gold fill on the --bg-subtle track, no glow,
            mirroring the memorization headline. */}
        <div className="mt-4">
          <ProgressBar value={pageOf604} max={604} color="var(--gold)" label={barLabel} />
        </div>

        {/* Quiet stat row: daily goal, days left, and the ahead/behind read. */}
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className="text-micro font-medium uppercase tracking-wide text-text-muted">
              {t("khatmah.dailyGoal")}
            </p>
            <p className="mt-0.5 text-body font-medium tabular-nums">
              {t("khatmah.pagesPerDay").replace("{n}", num(pace.dailyPagesNeeded))}
            </p>
          </div>
          {!pace.isComplete && (
            <div>
              <p className="text-micro font-medium uppercase tracking-wide text-text-muted">
                {t("khatmah.daysLeft").replace("{n}", num(pace.daysRemaining))}
              </p>
              <p className={`mt-0.5 text-body font-medium ${toneClass}`}>{statusLine.text}</p>
            </div>
          )}
          {pace.isComplete && (
            <p className={`text-body font-medium ${toneClass}`}>{statusLine.text}</p>
          )}
        </div>

        {/* Quiet controls: edit reopens the setup pre-filled; end asks once. */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {confirmEnd ? (
            <>
              <p className="text-small text-text-muted">{t("khatmah.endConfirm")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clear();
                  setConfirmEnd(false);
                }}
              >
                {t("khatmah.endYes")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(false)}>
                {t("khatmah.cancel")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                {t("khatmah.edit")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>
                {t("khatmah.end")}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// The inviting empty state: one quiet ornament accent and a single CTA. Mirrors
// the memorization tracker's empty branch so the two cards read as a set.
function KhatmahEmpty({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="khatmah-heading">
      <SectionHeading as="h2" className="mb-4">
        <span id="khatmah-heading">{t("khatmah.title")}</span>
      </SectionHeading>
      <div className="relative overflow-hidden rounded-xl border border-border bg-bg-card p-6 sm:p-8 dark:bg-bg-card-dark">
        <MedallionOrnament className="pointer-events-none absolute -top-6 end-[-1.5rem] h-28 w-28 opacity-20" />
        <div className="relative max-w-prose">
          <h3 className="font-heading text-h3 font-semibold">{t("khatmah.emptyTitle")}</h3>
          <p className="mt-2 text-body text-text-muted">{t("khatmah.emptyBody")}</p>
          <div className="mt-5">
            <Button variant="primary" onClick={onStart}>
              {t("khatmah.start")}
            </Button>
          </div>
          <p className="mt-4 text-small text-text-muted">{t("khatmah.emptyHelp")}</p>
        </div>
      </div>
    </section>
  );
}

// The inline setup: a duration preset (30/60/90 days) that derives the target, or
// a custom date. startPage defaults to the reader's current page so a learner
// already partway in is not reset to page 1. No modal, no route change.
function KhatmahSetup({
  existing,
  defaultStartPage,
  onCancel,
  onSave,
}: {
  existing: KhatmahPlan | null;
  defaultStartPage: number;
  onCancel: () => void;
  onSave: (plan: KhatmahPlan) => void;
}) {
  const { t, isAr } = useTranslation();
  const headingId = useId();
  const today = todayIso();

  // Editing keeps the original start date and start page; a fresh plan begins
  // today from the reader's current page.
  const startDate = existing?.startDate ?? today;
  const startPage = existing?.startPage ?? defaultStartPage;

  // Default selection: a 30-day plan, or the matching preset when editing an
  // existing plan whose span is exactly one of the presets; otherwise custom.
  const [duration, setDuration] = useState<(typeof DURATIONS)[number] | "custom">(30);
  const [customDate, setCustomDate] = useState<string>(
    existing?.targetDate ?? targetDateForDuration(startDate, 30),
  );

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  const targetDate =
    duration === "custom" ? customDate : targetDateForDuration(startDate, duration);

  // A custom date earlier than the start is not a valid plan; the save guard and
  // the sanitizer both reject it, so the button disables to keep the path calm.
  const valid = targetDate >= startDate;

  const handleSave = () => {
    if (!valid) return;
    onSave({ startDate, targetDate, startPage });
  };

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading as="h2" className="mb-4">
        <span id="khatmah-heading">{t("khatmah.title")}</span>
      </SectionHeading>
      <div
        role="group"
        aria-labelledby={headingId}
        className="rounded-xl border border-border bg-bg-card p-6 sm:p-8 dark:bg-bg-card-dark"
      >
        <h3 id={headingId} className="font-heading text-h3 font-semibold">
          {t("khatmah.setupTitle")}
        </h3>

        <fieldset className="mt-5">
          <legend className="text-micro font-medium uppercase tracking-wide text-text-muted">
            {t("khatmah.duration")}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <Button
                key={d}
                variant={duration === d ? "primary" : "secondary"}
                size="sm"
                aria-pressed={duration === d}
                onClick={() => {
                  setDuration(d);
                  setCustomDate(targetDateForDuration(startDate, d));
                }}
              >
                {t(DURATION_KEY[d])}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-micro font-medium text-text-muted">
            {t("khatmah.customDate")}
            <input
              type="date"
              min={startDate}
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDuration("custom");
              }}
              className={`${FIELD_CLASS} tabular-nums`}
              aria-label={t("khatmah.customDate")}
            />
          </label>
        </div>

        <p className="mt-4 text-small text-text-muted tabular-nums">
          {t("khatmah.startPageNote").replace("{page}", num(startPage))}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" onClick={handleSave} disabled={!valid}>
            {t("khatmah.save")}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {t("khatmah.cancel")}
          </Button>
        </div>
      </div>
    </section>
  );
}
