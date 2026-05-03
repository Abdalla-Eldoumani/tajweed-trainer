"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES, NAV_ITEMS, ChevronIcon } from "./nav-data";
import { useTranslation } from "@/lib/i18n";
import { useProgress } from "@/hooks/useProgress";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const learningModules = learningPath.modules as LearningModule[];

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
  const { t, isAr } = useTranslation();
  // Lock indicators are a hint, not enforcement (the route gates itself).
  // Render only after mount to avoid hydration mismatch from localStorage.
  const { progress } = useProgress();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const lockedModuleIds = useMemo(() => {
    if (!mounted) return new Set<string>();
    const set = new Set<string>();
    for (const m of learningModules) {
      if (!m.prerequisite) continue;
      const prereqDone = (progress.modules[m.prerequisite]?.lessonsCompleted.length ?? 0) > 0;
      if (!prereqDone) set.add(m.id);
    }
    return set;
  }, [mounted, progress]);

  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
        className={cn(
          "fixed top-0 bottom-0 w-[280px] z-50 bg-bg-card dark:bg-bg-card-dark flex flex-col transition-transform duration-300 ease-in-out",
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
        <div className="flex items-center justify-between p-4 border-b border-gold-light/30 dark:border-gold-dark/20">
          <div>
            <h2 className="text-base font-heading font-bold text-primary dark:text-primary-light">
              {t("app.title")}
            </h2>
            <p className="text-xs font-arabic text-text-muted" dir="rtl" lang="ar">
              {t("app.titleAr")}
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={t("nav.closeMenu")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                        ? "bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light"
                        : "text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
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
                        ? "bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light"
                        : "text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
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
                          ? "text-primary dark:text-primary-light"
                          : "text-text-muted hover:text-text dark:hover:text-text-dark"
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
                              ? "text-primary font-medium dark:text-primary-light"
                              : "text-text-muted hover:text-text dark:hover:text-text-dark"
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
