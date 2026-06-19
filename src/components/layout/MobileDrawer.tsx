"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES, NAV_ITEMS, ChevronIcon } from "./nav-data";
import { useTranslation } from "@/lib/i18n";
import { useProgress } from "@/hooks/useProgress";
import { getLockedModuleIds } from "@/lib/module-unlock";

const LockIndicator = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const [learnExpanded, setLearnExpanded] = useState(pathname.startsWith("/learn"));
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The control that had focus when the drawer opened, so focus returns there
  // on close instead of being lost to the top of the page.
  const openerRef = useRef<HTMLElement | null>(null);
  const { t, isAr } = useTranslation();
  // Lock indicators are a hint, not enforcement (the route gates itself).
  // Render only after mount to avoid hydration mismatch from localStorage.
  const { progress } = useProgress();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const lockedModuleIds = useMemo(() => {
    if (!mounted) return new Set<string>();
    return getLockedModuleIds(progress);
  }, [mounted, progress]);

  useEffect(() => {
    if (open) {
      openerRef.current = (document.activeElement as HTMLElement) ?? null;
      closeRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      // Return focus to the opener (the hamburger button) when closing.
      openerRef.current?.focus?.();
      openerRef.current = null;
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Keep Tab focus inside the open drawer (it is an aria-modal dialog). Wrap
  // from the last focusable element back to the first and vice versa.
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

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        onKeyDown={trapTab}
        // While closed the panel is translated off-screen but still in the DOM;
        // `inert` keeps its links out of the tab order and a11y tree until open.
        inert={!open}
        className={cn(
          "fixed top-0 bottom-0 w-[280px] z-50 bg-[var(--margin-bg)] text-[var(--margin-text)] border-e border-[var(--margin-line)] flex flex-col transition-transform duration-300 ease-in-out",
          isAr ? "right-0" : "left-0",
          open
            ? "translate-x-0"
            : isAr ? "translate-x-full" : "-translate-x-full"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.toggleMenu")}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--margin-line)]">
          <div>
            <h2 className="text-base font-heading font-bold text-[var(--margin-active)]">
              {t("app.title")}
            </h2>
            <p className="text-xs font-arabic text-[var(--margin-muted)]" dir="rtl" lang="ar">
              {t("app.titleAr")}
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-[var(--margin-text)] hover:bg-[var(--margin-hover-bg)]"
            aria-label={t("nav.closeMenu")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label={t("nav.drawer")}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            const label = isAr ? item.labelAr : item.label;

            return (
              <div key={item.href}>
                {item.expandable ? (
                  <button
                    onClick={() => setLearnExpanded(!learnExpanded)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full min-h-[44px]",
                      isActive
                        ? "bg-[var(--margin-active-bg)] text-[var(--margin-active)]"
                        : "text-[var(--margin-muted)] hover:bg-[var(--margin-hover-bg)] hover:text-[var(--margin-text)]"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1 text-start">{label}</span>
                    <ChevronIcon className={cn("w-4 h-4 transition-transform", learnExpanded && "rotate-90", isAr && !learnExpanded && "rotate-180")} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                      isActive
                        ? "bg-[var(--margin-active-bg)] text-[var(--margin-active)]"
                        : "text-[var(--margin-muted)] hover:bg-[var(--margin-hover-bg)] hover:text-[var(--margin-text)]"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{label}</span>
                  </Link>
                )}

                {item.expandable && learnExpanded && (
                  <div className="ms-8 mt-1 space-y-0.5">
                    <Link
                      href="/learn"
                      onClick={onClose}
                      className={cn(
                        "flex items-center px-3 py-2 rounded text-xs font-medium transition-colors min-h-[44px]",
                        pathname === "/learn"
                          ? "text-[var(--margin-active)]"
                          : "text-[var(--margin-muted)] hover:text-[var(--margin-text)]"
                      )}
                    >
                      {t("nav.allModules")}
                    </Link>
                    {MODULES.map((m) => {
                      const moduleActive = pathname === `/learn/${m.id}`;
                      const isLocked = lockedModuleIds.has(m.id);
                      return (
                        <Link
                          key={m.id}
                          href={`/learn/${m.id}`}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded text-xs transition-colors min-h-[44px]",
                            moduleActive
                              ? "text-[var(--margin-active)] font-medium"
                              : "text-[var(--margin-muted)] hover:text-[var(--margin-text)]"
                          )}
                          aria-label={isLocked ? `${isAr ? m.labelAr : m.label} (${t("learn.locked")})` : undefined}
                        >
                          <span className="flex-1">{isAr ? m.labelAr : m.label}</span>
                          {isLocked && <LockIndicator className="opacity-70 shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
