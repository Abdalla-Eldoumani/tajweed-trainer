"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { pageForJuz, pageForSurah, TOTAL_JUZ } from "@/lib/navigation";
import { clampPage } from "@/lib/validate";
import { toArabicIndic, cn } from "@/lib/utils";
import { ArabicText } from "@/components/ui/ArabicText";
import { usePaletteOpen } from "./palette-open";
import type { SurahHeader } from "@/lib/types";

// Total mushaf pages, matching navigation.ts TOTAL_MUSHAF_PAGES. A page-number
// row is offered only for a query in 1..604.
const TOTAL_PAGES = 604;
// Cap the rendered surah rows so an empty or broad query never paints all 114
// heavy rows. The list scrolls; the cap keeps it responsive (threat T-06-06).
const MAX_SURAH_ROWS = 50;

type Row =
  | { kind: "surah"; key: string; primary: string; primaryAr: string; secondary: string; target: number }
  | { kind: "juz"; key: string; primary: string; secondary: string; target: number }
  | { kind: "page"; key: string; primary: string; secondary: string; target: number };

const MagnifierIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

interface ReaderPaletteProps {
  open: boolean;
  onClose: () => void;
  surahs: SurahHeader[];
}

export function ReaderPalette({ open, onClose, surahs }: ReaderPaletteProps) {
  const { t, isAr } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // The control focused when the palette opened (the toolbar trigger or wherever
  // Cmd/Ctrl+K fired), so focus returns there on close instead of falling to body.
  const openerRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Build the typed row list from a focused LOCAL filter over the bundled index
  // (NOT search.ts, which would pull rules/modules/waqf into the reader). A
  // numeric query can match a surah number, a juz, and a page at once; all three
  // show as separate rows disambiguated by their muted secondary (UI-SPEC B4).
  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: Row[] = [];

    // Surahs: match name (en + ar) or number as a substring.
    const surahRows: Row[] = [];
    for (const s of surahs) {
      const matches =
        s.nameSimple.toLowerCase().includes(q) ||
        s.nameArabic.includes(query.trim()) ||
        String(s.number).includes(q);
      if (!matches) continue;
      const firstPage = s.pages[0];
      surahRows.push({
        kind: "surah",
        key: `surah-${s.number}`,
        primary: s.nameSimple,
        primaryAr: s.nameArabic,
        secondary: `${t("mushaf.quickJumpSurah").replace("{n}", isAr ? toArabicIndic(s.number) : String(s.number))} · ${t(
          "mushaf.quickJumpPage",
        ).replace("{n}", isAr ? toArabicIndic(firstPage) : String(firstPage))}`,
        target: pageForSurah(s.number),
      });
      if (surahRows.length >= MAX_SURAH_ROWS) break;
    }
    out.push(...surahRows);

    // Juz: a number in 1..30, or the word juz / الجزء, offers a juz row.
    const asNum = Number(q);
    const isNumeric = q !== "" && Number.isFinite(asNum) && /^\d+$/.test(q);
    const wantsJuz = q === "juz" || q.includes("الجزء");
    if (isNumeric && asNum >= 1 && asNum <= TOTAL_JUZ) {
      const target = pageForJuz(asNum);
      out.push({
        kind: "juz",
        key: `juz-${asNum}`,
        primary: `${t("mushaf.juz")} ${isAr ? toArabicIndic(asNum) : asNum}`,
        secondary: t("mushaf.quickJumpPage").replace("{n}", isAr ? toArabicIndic(target) : String(target)),
        target,
      });
    } else if (wantsJuz) {
      // Bare "juz" with no number lists the first juz as a sensible default entry.
      const target = pageForJuz(1);
      out.push({
        kind: "juz",
        key: "juz-1",
        primary: `${t("mushaf.juz")} ${isAr ? toArabicIndic(1) : 1}`,
        secondary: t("mushaf.quickJumpPage").replace("{n}", isAr ? toArabicIndic(target) : String(target)),
        target,
      });
    }

    // Page: a number in 1..604 offers a page row (clamped explicitly).
    if (isNumeric && asNum >= 1 && asNum <= TOTAL_PAGES) {
      const target = clampPage(asNum);
      out.push({
        kind: "page",
        key: `page-${target}`,
        primary: t("mushaf.quickJumpPage").replace("{n}", isAr ? toArabicIndic(target) : String(target)),
        secondary: t("mushaf.pageNumber"),
        target,
      });
    }

    return out;
  }, [query, surahs, t, isAr]);

  const hasQuery = query.trim().length > 0;
  const noMatch = hasQuery && rows.length === 0;

  // Reset selection as the user types (a user event, not an effect) so the first
  // match is always highlighted.
  const onQueryChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  // Open effect (mirrors MobileDrawer): capture the opener, lock body scroll,
  // clear any stale query, focus the input, and flip the shared palette-open
  // signal so the playback sheet yields its focus trap. This single effect owns
  // the signal so there is one source of truth; closing restores focus, unlocks
  // scroll, and clears the signal.
  useEffect(() => {
    if (open) {
      openerRef.current = (document.activeElement as HTMLElement) ?? null;
      document.body.style.overflow = "hidden";
      usePaletteOpen.getState().setOpen(true);
      // Clear any stale query and focus the input after paint (deferred so the
      // input is mounted and so the reset is not a synchronous effect-body
      // setState).
      const id = requestAnimationFrame(() => {
        setQuery("");
        setActiveIndex(0);
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    document.body.style.overflow = "";
    usePaletteOpen.getState().setOpen(false);
    openerRef.current?.focus?.();
    openerRef.current = null;
    return undefined;
  }, [open]);

  // Cleanup on unmount: never leave the body locked or the signal stuck on.
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      usePaletteOpen.getState().setOpen(false);
    };
  }, []);

  // Keep the active row scrolled into view as arrow keys move it.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-row-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const navigateTo = (target: number) => {
    router.push(`/mushaf/page/${target}`);
    onClose();
  };

  // Trap Tab within the dialog (input + rows), wrapping, per MobileDrawer.
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
      // Close ONLY the palette. The sheet's Escape is a document-level native
      // listener; React's synthetic stopPropagation alone would NOT stop the
      // native event from bubbling to it, so stop the native event immediately.
      // Closing the palette must not reach the sheet's Escape -> stop() and kill
      // playback (UI-SPEC B8).
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      if (rows.length === 0) return;
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % rows.length);
      return;
    }
    if (e.key === "ArrowUp") {
      if (rows.length === 0) return;
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + rows.length) % rows.length);
      return;
    }
    if (e.key === "Enter") {
      const row = rows[activeIndex];
      if (!row) return; // No active row (no matches) -> no-op.
      e.preventDefault();
      navigateTo(row.target);
      return;
    }
    trapTab(e);
  };

  // Portal to the body so the backdrop escapes the reader's stacking context and
  // covers the bottom tab bar; mounted gates it for SSR safety.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const content = (
    <div
      role="presentation"
      // While closed the dialog stays in the DOM but inert keeps its controls out
      // of the tab order and the a11y tree.
      inert={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered card, anchored toward the top third. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]",
          open ? "" : "pointer-events-none",
        )}
        onKeyDown={onKeyDown}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("mushaf.quickJump")}
          style={{ boxShadow: "0 8px 24px -12px rgba(16,20,32,0.30)" }}
          className={cn(
            "w-[calc(100%-2rem)] max-w-[560px] rounded-xl border border-[var(--gold-hairline)] bg-bg-card dark:bg-bg-card-dark overflow-hidden",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          )}
        >
          {/* Input row */}
          <div className="flex items-center gap-2 border-b border-border px-4">
            <MagnifierIcon className="shrink-0 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t("mushaf.quickJumpPlaceholder")}
              aria-label={t("mushaf.quickJumpPlaceholder")}
              className="w-full min-h-[44px] bg-bg-card dark:bg-bg-card-dark text-body text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              dir={isAr ? "rtl" : "ltr"}
            />
          </div>

          {/* Results */}
          <ul ref={listRef} role="listbox" aria-label={t("mushaf.quickJump")} className="max-h-[50vh] overflow-y-auto py-1">
            {!hasQuery && (
              <li className="px-4 py-3 text-small text-text-muted" role="presentation">
                {t("mushaf.quickJumpHint")}
              </li>
            )}

            {noMatch && (
              <li className="px-4 py-3 text-small text-text-muted" role="presentation">
                {t("mushaf.quickJumpNoResults")}
              </li>
            )}

            {rows.map((row, i) => {
              const active = i === activeIndex;
              return (
                <li key={row.key} role="option" aria-selected={active} data-row-index={i}>
                  <button
                    type="button"
                    onClick={() => navigateTo(row.target)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "flex w-full min-h-[44px] flex-col justify-center px-4 py-2 text-start transition-colors",
                      active ? "bg-bg-subtle dark:bg-bg-subtle-dark" : "hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
                    )}
                  >
                    {row.kind === "surah" ? (
                      <span className="text-body text-text">
                        {isAr ? (
                          <ArabicText text={row.primaryAr} size="sm" />
                        ) : (
                          <>
                            <span className="tabular-nums text-text-muted">{row.key.replace("surah-", "")}. </span>
                            {row.primary}
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-body text-text tabular-nums">{row.primary}</span>
                    )}
                    <span className="text-small text-text-muted tabular-nums">{row.secondary}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(content, document.body) : null;
}
