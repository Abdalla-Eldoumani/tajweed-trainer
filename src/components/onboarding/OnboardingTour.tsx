"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";
import { getOnboardingSeen, setOnboardingSeen } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";
import { cn } from "@/lib/utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { Button } from "@/components/ui/Button";
import { MedallionOrnament } from "@/components/ui/Ornament";

// The first-launch steps covering the v2 surfaces: the reader + verse overlay,
// the five themes, follow-along (the recited-word highlight), and the
// memorization tracker/recall. Copy is i18n keys only (never verse/hadith text);
// the values live under onboarding.step.* in i18n.ts. The dots, the stepOf
// counter, isLast, and the Back/Next/Got-it placement all derive from
// STEPS.length, so changing this array adapts the whole modal.
const STEPS = [
  { titleKey: "onboarding.step.mushaf.title", bodyKey: "onboarding.step.mushaf.body" },
  { titleKey: "onboarding.step.themes.title", bodyKey: "onboarding.step.themes.body" },
  { titleKey: "onboarding.step.followAlong.title", bodyKey: "onboarding.step.followAlong.body" },
  { titleKey: "onboarding.step.tracker.title", bodyKey: "onboarding.step.tracker.body" },
] as const;

// First-launch onboarding modal. Reuses the ReaderPalette overlay mechanics
// verbatim (portal to body, inert when closed, body-scroll lock with an unmount
// cleanup, opener capture/restore, trapTab, motion-reduce variants) but owns its
// own open state: it self-gates on the seen-once storage flag instead of a parent
// `open` prop, and anchors to the viewport center because a welcome reads better
// centered than at the top third.
export function OnboardingTour() {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  // The primary (Next / Start) control. Its element is stable across steps (only
  // the label changes on the last step), so it is the safe focus target on open
  // and whenever a control disappears mid-step.
  const primaryRef = useRef<HTMLButtonElement>(null);
  // The control focused when the modal opened, restored on close so focus never
  // falls to <body>.
  const openerRef = useRef<HTMLElement | null>(null);

  // mounted gates SSR; seen is read post-mount from the storage funnel. open is
  // derived, so the modal never renders during hydration and never flashes.
  const [mounted, setMounted] = useState(false);
  const [seen, setSeen] = useState(true);
  const [step, setStep] = useState(0);

  // Seed the seen-once flag post-mount, then subscribe to the progress change
  // bus so a later write re-evaluates it without a reload: the Settings toggle
  // writes setOnboardingSeen(false), the flag flips, seen becomes false, and the
  // derived open turns true — the tour re-shows live. Re-open-loop guard:
  // opening writes NO flag (only close() writes true on an explicit dismissal,
  // only the Settings toggle writes false), and re-reading on a bus event is
  // idempotent (a read emits nothing), so there is no feedback loop. Mirrors the
  // useVerseNotes seed-and-subscribe shape; the cleanup is the unsubscribe.
  useEffect(() => {
    setMounted(true);
    setSeen(getOnboardingSeen());
    return subscribeProgressChanged(() => setSeen(getOnboardingSeen()));
  }, []);

  const open = mounted && !seen;

  // Stable ids tie the dialog's accessible name to the eyebrow and its
  // description to the current step heading/body.
  const baseId = useId();
  const eyebrowId = `${baseId}-title`;
  const headingId = `${baseId}-heading`;
  const bodyId = `${baseId}-body`;

  const isLast = step === STEPS.length - 1;

  // Single dismissal path used by Start, Skip, Escape, and the backdrop: record
  // seen through the storage funnel (so it never shows again until a reset) and
  // flip local seen, which drives open=false. The open effect then unlocks scroll
  // and restores focus to the opener; the dialog goes inert and transitions out
  // (it is not unmounted, matching the ReaderPalette pattern).
  const close = () => {
    setOnboardingSeen(true);
    setSeen(true);
  };

  const goNext = () => {
    if (isLast) {
      close();
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const goBack = () => {
    const next = Math.max(0, step - 1);
    setStep(next);
    // On step 0 the Back control is not rendered. If Back had focus when it was
    // activated, removing it would strand focus on <body>; move focus to the
    // always-present primary (Next) control instead (W3). rAF runs after the
    // commit that removes Back so the focus lands on the live element.
    if (next === 0) {
      requestAnimationFrame(() => primaryRef.current?.focus());
    }
  };

  // Open effect mirrors ReaderPalette: capture the opener, reset to the first
  // step, and move initial focus to the primary control after paint. Closing
  // restores focus. Body-scroll is locked by the dedicated effect below.
  useEffect(() => {
    if (open) {
      openerRef.current = (document.activeElement as HTMLElement) ?? null;
      const id = requestAnimationFrame(() => {
        setStep(0);
        primaryRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    openerRef.current?.focus?.();
    openerRef.current = null;
    return undefined;
  }, [open]);

  // Body-scroll lock via the shared ref-counted source: locked while open,
  // released on close/unmount. Exactly one lock per open, so it coordinates with
  // any other overlay through the single counter.
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  // Trap Tab within the dialog (wrap first<->last), identical to ReaderPalette /
  // MobileDrawer.
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      // Escape = skip. preventDefault and close; there is no nested overlay
      // here, but keep Escape on the centered container for parity with the
      // palette pattern.
      e.preventDefault();
      close();
      return;
    }
    trapTab(e);
  };

  const current = STEPS[step];
  const counter = t("onboarding.stepOf")
    .replace("{current}", String(step + 1))
    .replace("{total}", String(STEPS.length));

  const content = (
    <div role="presentation" inert={!open}>
      {/* Backdrop: tap = skip. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Centered card (a welcome reads better centered than at the top third). */}
      <div
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center px-4 py-8",
          open ? "" : "pointer-events-none",
        )}
        onKeyDown={onKeyDown}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${eyebrowId} ${headingId}`}
          aria-describedby={bodyId}
          style={{ boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)" }}
          className={cn(
            "w-[calc(100%-2rem)] max-w-[560px] rounded-xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark p-6 sm:p-8",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          )}
        >
          {/* Eyebrow + Skip row */}
          <div className="flex items-start justify-between gap-2">
            <span
              id={eyebrowId}
              className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted"
            >
              {t("onboarding.title")}
            </span>
            <Button
              variant="ghost"
              size="md"
              onClick={close}
              className="ms-auto -me-2 -mt-2"
            >
              {t("onboarding.skip")}
            </Button>
          </div>

          {/* One centered procedural ornament (the single clearly-Islamic accent). */}
          <MedallionOrnament className="mx-auto mt-2 h-16 w-16 opacity-80 sm:h-20 sm:w-20" />

          {/* Step heading + body */}
          <h2
            id={headingId}
            className="mt-4 text-center font-heading text-h3 font-semibold text-text dark:text-text-dark"
          >
            {t(current.titleKey)}
          </h2>
          <p
            id={bodyId}
            className="mx-auto mt-2 max-w-[60ch] text-center text-body text-text-muted"
          >
            {t(current.bodyKey)}
          </p>

          {/* Step dots (decorative; the textual counter is the a11y indicator). */}
          <div className="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors motion-reduce:transition-none",
                  i === step ? "bg-gold" : "bg-bg-subtle dark:bg-bg-subtle-dark",
                )}
              />
            ))}
          </div>

          {/* Controls: Back inline-start, counter centered, Next/Start inline-end.
              Back is omitted on step 0; an empty spacer keeps justify-between
              placement stable. */}
          <div className="mt-6 flex items-center justify-between gap-2">
            {step > 0 ? (
              <Button variant="outline" size="md" onClick={goBack}>
                {t("onboarding.back")}
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}

            <span className="text-micro tabular-nums text-text-muted">
              {counter}
            </span>

            <Button ref={primaryRef} variant="primary" size="md" onClick={goNext}>
              {isLast ? t("onboarding.done") : t("common.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(content, document.body) : null;
}
