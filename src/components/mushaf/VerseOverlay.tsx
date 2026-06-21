"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { TajweedText } from "@/components/ui/TajweedText";
import type { MushafPageData, SurahHeader } from "@/lib/types";

// One focused surface for a single verse, opened over a dimmed, inert page. It
// replaces the page-shrinking docked panel as the primary verse interaction on a
// pointer device: tapping a verse opens this, and everything the learner can do
// to that verse lives here instead of as inline buttons on the page.
//
// The mechanics (portal to body, inert when closed, ref-counted body-scroll
// lock, opener focus capture/restore, Tab trap, Escape + scrim-tap + explicit
// close, reduced-motion-aware entrance) are the proven pattern shared with
// ReaderPalette and OnboardingTour; this mirrors them rather than inventing a
// second overlay primitive. Playback commands the single global player store
// through the helpers passed in from the reader, so there is no second <audio>.
//
// The centered panel is the pointer form. The touch bottom-sheet form is a
// later variant of this same shell, not a fork.

interface VerseOverlayProps {
  open: boolean;
  onClose: () => void;
  // "surah:ayah"; null when nothing is open. Parsed into sv/av for the body.
  verseKey: string | null;
  data: MushafPageData;
  surahs: SurahHeader[];
  // Passed in so surah-name / reciter / speed resolution stays in the reader
  // (one place); the overlay just commands them.
  playSingleVerse: (sv: number, av: number) => void;
  playFromVerse: (sv: number, av: number) => void;
}

export function VerseOverlay({
  open,
  onClose,
  verseKey,
  data,
  surahs,
  playSingleVerse,
  playFromVerse,
}: VerseOverlayProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  // The "play this verse" control: the auto-focused primary so Enter/tap plays
  // immediately on open. Pointed at the button in the action row below.
  const primaryRef = useRef<HTMLButtonElement>(null);
  // The element focused when the overlay opened (the tapped verse button), so
  // closing returns focus there instead of letting it fall to <body>.
  const openerRef = useRef<HTMLElement | null>(null);

  // Stable ids tie the dialog's accessible name to the verse reference and its
  // description to the verse text.
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const bodyId = `${baseId}-body`;

  // Portal target exists only in the browser; mounted gates SSR so the dialog
  // never renders during hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Capture the opener and move initial focus to the primary control after
  // paint; restore focus to the opener on close. This is what returns focus to
  // the triggering verse.
  useEffect(() => {
    if (open) {
      openerRef.current = (document.activeElement as HTMLElement) ?? null;
      const id = requestAnimationFrame(() => primaryRef.current?.focus());
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

  // Trap Tab within the dialog (wrap first <-> last), identical to ReaderPalette
  // / OnboardingTour.
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

  // Escape closes; everything else delegates to the Tab trap. Escape lives on
  // the container's synthetic onKeyDown only, NOT a document listener: a
  // document-level Escape would collide with the quick-jump palette's
  // stopImmediatePropagation guard (which exists so closing the palette never
  // reaches the playback Escape -> stop()). The React synthetic handler does not.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    trapTab(e);
  };

  const content = (
    <div role="presentation" inert={!open}>
      {/* Scrim: the ink at ~60%, a faint backdrop blur as a focus aid only (not a
          frosted aesthetic). Tap = dismiss. Fades at the short motion duration. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity [transition-duration:var(--motion-short)] motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered container; Escape + Tab trap live here. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center px-4 py-8",
          open ? "" : "pointer-events-none",
        )}
        onKeyDown={onKeyDown}
      >
        {/* Panel rises from 0.98 scale at the medium duration with the standard
            ease-out; reduced motion is opacity-only. */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          aria-describedby={bodyId}
          style={{ boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)" }}
          className={cn(
            "w-[calc(100%-2rem)] max-w-[560px] rounded-xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark p-6 sm:p-8",
            "transition-[opacity,transform] [transition-duration:var(--motion-medium)] [transition-timing-function:var(--ease-out)] motion-reduce:transition-none",
            open ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
          )}
        >
          {/* The verse header and the primary action row are added next. The
              expandable sections (range, repeat/loop/gap, reciter compare, the
              note field, reading depth) are lifted in a following step. */}
          <span id={labelId} className="sr-only">
            {t("player.playVerse")}
          </span>
          <span id={bodyId} className="sr-only" />
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(content, document.body) : null;
}
