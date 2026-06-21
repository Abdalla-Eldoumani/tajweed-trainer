"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";
import { getWarshDisclaimerAck, setWarshDisclaimerAck } from "@/lib/storage";
import { getYounesSurahUrl } from "@/lib/mp3quran-url";
import { toSafeAudioUrl } from "@/lib/media-url";
import { clampSurah } from "@/lib/validate";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ArabicText } from "@/components/ui/ArabicText";
import type { SurahHeader } from "@/lib/types";

interface YounesNarrationPanelProps {
  // The bundled surah index, used only to label the per-surah selector. The sole
  // functional input is a surah number (1..114), clamped before any URL is built.
  surahs: SurahHeader[];
}

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn("transition-transform motion-reduce:transition-none", open && "rotate-90")}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// The walled-off Younes Souilass surface: a separate, disclaimer-gated, per-surah
// "different narration" (Warsh) entry. It shares ZERO state with the Hafs player.
//
// Isolation is the whole point of this file: it has its OWN <audio> element and
// local playing/error state, and it NEVER imports or calls usePlayer, playVerse,
// fetchAudioUrl, EVERYAYAH_FOLDER, or RECITATIONS. Coupling it to the global
// player store would risk the Hafs queue/resume/error state. The per-surah URL
// comes from getYounesSurahUrl -> toSafeAudioUrl (server16.mp3quran.net only);
// Warsh's partial coverage means an uncovered surah returns 404, which degrades
// quietly to a localized "not available in this narration" message, never a
// crash. The disclaimer mechanics clone OnboardingTour; the collapsible transport
// shape is ReciterCompare inverted (its own element, not the store).
export function YounesNarrationPanel({ surahs }: YounesNarrationPanelProps) {
  const { t, isAr } = useTranslation();

  // mounted gates SSR: the acknowledged flag and the <audio> are client-only, so
  // nothing store-derived renders during hydration.
  const [mounted, setMounted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [open, setOpen] = useState(false);
  const [surah, setSurah] = useState(1);

  // The isolated player's local state. No store, no shared element.
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  // null = no message; otherwise a localized key for the quiet failure line.
  const [errorKey, setErrorKey] = useState<"warsh.notAvailable" | "warsh.loadError" | null>(null);

  // The disclaimer gate (clone of OnboardingTour mechanics). It opens on the
  // first play attempt while not acknowledged; acknowledging sets the flag and
  // proceeds to play. dialogOpen is the modal's own visibility.
  const [dialogOpen, setDialogOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const acknowledgeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const bodyId = `${baseId}-body`;

  useEffect(() => {
    setMounted(true);
    setAcknowledged(getWarshDisclaimerAck());
  }, []);

  const surahOptions = useMemo(
    () => [...surahs].sort((a, b) => a.number - b.number),
    [surahs],
  );

  const selectedSurahName = useMemo(() => {
    const meta = surahOptions.find((s) => s.number === surah);
    if (!meta) return String(surah);
    return isAr ? meta.nameArabic : meta.nameSimple;
  }, [surahOptions, surah, isAr]);

  // Load the per-surah Warsh URL into the isolated element and play it. The URL
  // is built and gated through the host allowlist; a rejected URL (should not
  // happen for server16) or a host/availability failure surfaces the quiet line.
  const playSurah = (n: number) => {
    const el = audioRef.current;
    if (!el) return;
    const url = toSafeAudioUrl(getYounesSurahUrl(clampSurah(n)), "");
    if (!url) {
      setErrorKey("warsh.notAvailable");
      return;
    }
    setErrorKey(null);
    setLoading(true);
    el.src = url;
    void el.play().catch(() => {
      // A play() rejection here is a load/availability failure (autoplay is not
      // an issue: this is a user gesture). onError below also fires for a 404;
      // both paths land on a quiet localized line, never a thrown error.
      setLoading(false);
      setPlaying(false);
    });
  };

  // The transport control. If the disclaimer has not been acknowledged, open the
  // gate first (and play after acknowledging); otherwise toggle play/pause.
  const onTransport = () => {
    const el = audioRef.current;
    if (playing && el) {
      el.pause();
      return;
    }
    if (!acknowledged) {
      setDialogOpen(true);
      return;
    }
    playSurah(surah);
  };

  // Acknowledge through the storage funnel (so reset re-shows it), close the
  // gate, and proceed to play the selected surah.
  const acknowledge = () => {
    setWarshDisclaimerAck(true);
    setAcknowledged(true);
    setDialogOpen(false);
    playSurah(surah);
  };

  const closeDialog = () => setDialogOpen(false);

  // Body-scroll lock while the gate is open, released on close/unmount, via the
  // shared ref-counted source (coordinates with any other overlay).
  useEffect(() => {
    if (!dialogOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [dialogOpen]);

  // Capture the opener on open and move focus to the acknowledge control after
  // paint; restore focus to the opener on close so it never falls to <body>.
  useEffect(() => {
    if (dialogOpen) {
      openerRef.current = (document.activeElement as HTMLElement) ?? null;
      const id = requestAnimationFrame(() => acknowledgeRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    openerRef.current?.focus?.();
    openerRef.current = null;
    return undefined;
  }, [dialogOpen]);

  // Trap Tab within the dialog (wrap first<->last), identical to OnboardingTour.
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
      e.preventDefault();
      closeDialog();
      return;
    }
    trapTab(e);
  };

  const playPill =
    "inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light hover:bg-primary/20 text-sm font-medium transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:pointer-events-none";

  const dialog = (
    <div role="presentation" inert={!dialogOpen}>
      {/* Backdrop: tap = cancel. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 motion-reduce:transition-none",
          dialogOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={closeDialog}
        aria-hidden="true"
      />

      {/* Centered card. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center px-4 py-8",
          dialogOpen ? "" : "pointer-events-none",
        )}
        onKeyDown={onKeyDown}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          style={{ boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)" }}
          className={cn(
            "w-[calc(100%-2rem)] max-w-[560px] rounded-xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark p-6 sm:p-8",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            dialogOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          )}
        >
          <h2
            id={titleId}
            className="font-heading text-h3 font-semibold text-text dark:text-text-dark"
          >
            {t("warsh.disclaimerTitle")}
          </h2>
          <p id={bodyId} className="mt-3 text-body text-text-muted">
            {t("warsh.disclaimerBody")}
          </p>

          {/* External reference: a link, not a fetch (no CSP/connect-src entry). */}
          <a
            href="https://en.wikipedia.org/wiki/Warsh"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary dark:text-primary-light hover:underline underline-offset-2"
          >
            {t("warsh.referenceLinkLabel")}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="outline" size="md" onClick={closeDialog}>
              {t("warsh.cancel")}
            </Button>
            <Button ref={acknowledgeRef} variant="primary" size="md" onClick={acknowledge}>
              {t("warsh.acknowledge")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Gate the whole surface on mount so the acknowledged flag and audio state
  // never flash before hydration.
  if (!mounted) return null;

  return (
    <div className="rounded-xl border border-gold-light/30 dark:border-gold-dark/20 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary dark:hover:text-primary-light"
      >
        <ChevronIcon open={open} />
        {t("warsh.entryTitle")}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-text-muted">{t("warsh.entrySubtitle")}</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1.5 sm:flex-1">
              <span className="text-[11px] text-text-muted">{t("warsh.surahSelectLabel")}</span>
              <select
                value={surah}
                onChange={(e) => {
                  // Switching surahs stops the current playback and clears any
                  // stale message; the next play loads the new surah's URL.
                  audioRef.current?.pause();
                  setPlaying(false);
                  setErrorKey(null);
                  setSurah(clampSurah(Number(e.target.value)));
                }}
                aria-label={t("warsh.surahSelectLabel")}
                className="min-h-[44px] rounded-lg bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 px-3 text-sm"
              >
                {surahOptions.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {isAr ? s.nameArabic : s.nameSimple}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onTransport}
              disabled={loading}
              aria-label={
                playing
                  ? t("warsh.pause")
                  : t("warsh.playSurah").replace("{surah}", selectedSurahName)
              }
              className={playPill}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
              {playing
                ? t("warsh.pause")
                : t("warsh.playSurah").replace("{surah}", selectedSurahName)}
            </button>
          </div>

          {/* Surah name in the script, for clarity beside the Latin selector. */}
          <ArabicText
            text={selectedSurahName}
            size="sm"
            className="block text-gold-dark dark:text-gold-light"
          />

          {errorKey && (
            <p role="status" className="text-xs text-accent">
              {t(errorKey)}
            </p>
          )}

          {/* The single sanctioned second <audio>: isolated from usePlayer. */}
          <audio
            ref={audioRef}
            preload="none"
            onPlaying={() => {
              setLoading(false);
              setPlaying(true);
              setErrorKey(null);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => {
              // The common case is a 404 for a surah outside Warsh's partial
              // coverage; show the quiet "not available" line. Never a crash,
              // never a console error surfaced to the user.
              setLoading(false);
              setPlaying(false);
              setErrorKey("warsh.notAvailable");
            }}
          />
        </div>
      )}

      {createPortal(dialog, document.body)}
    </div>
  );
}
