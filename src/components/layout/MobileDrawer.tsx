"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES, NAV_ITEMS, ChevronIcon } from "./nav-data";
import { useTranslation } from "@/lib/i18n";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const [learnExpanded, setLearnExpanded] = useState(pathname.startsWith("/learn"));
  const closeRef = useRef<HTMLButtonElement>(null);
  const { t, isAr } = useTranslation();

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
                      return (
                        <Link
                          key={m.id}
                          href={`/learn/${m.id}`}
                          onClick={onClose}
                          className={cn(
                            "flex items-center px-3 py-2 rounded text-xs transition-colors min-h-[44px]",
                            moduleActive
                              ? "text-primary font-medium dark:text-primary-light"
                              : "text-text-muted hover:text-text dark:hover:text-text-dark"
                          )}
                        >
                          {isAr ? m.labelAr : m.label}
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
