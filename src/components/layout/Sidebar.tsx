"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MODULES, NAV_ITEMS, ChevronIcon } from "./nav-data";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
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

export function Sidebar() {
  const pathname = usePathname();
  const [learnExpanded, setLearnExpanded] = useState(pathname.startsWith("/learn"));
  const { t, isAr } = useTranslation();
  // Lock indicators are a hint, not enforcement (the route gates itself).
  // Render them only after mount to avoid hydration mismatch from localStorage.
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

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen fixed top-0 bg-bg-card dark:bg-bg-card-dark border-e border-gold-light/30 dark:border-gold-dark/20 overflow-y-auto sidebar-desktop inset-inline-start-0">
        <div className="p-5 border-b border-gold-light/30 dark:border-gold-dark/20">
          <Link href="/" className="block">
            <h1 className="text-lg font-heading font-bold text-primary dark:text-primary-light">
              {t("app.title")}
            </h1>
            <p className="text-sm font-arabic text-text-muted mt-0.5" dir="rtl" lang="ar">
              {t("app.titleAr")}
            </p>
          </Link>
          <div className="mt-3">
            <LanguageToggle />
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

            const label = isAr ? item.labelAr : item.label;

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (item.expandable) {
                      e.preventDefault();
                      setLearnExpanded(!learnExpanded);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light"
                      : "text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{label}</span>
                  {item.expandable && (
                    <ChevronIcon className={cn("w-4 h-4 transition-transform", learnExpanded && "rotate-90", isAr && !learnExpanded && "rotate-180")} />
                  )}
                </Link>

                {item.expandable && learnExpanded && (
                  <div className="ms-8 mt-1 space-y-0.5">
                    <Link
                      href="/learn"
                      className={cn(
                        "block px-3 py-1.5 rounded text-xs font-medium transition-colors",
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
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors",
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
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-bg-card dark:bg-bg-card-dark border-t border-gold-light/30 dark:border-gold-dark/20 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.filter((i) => !i.expandable || i.href === "/learn").map((item) => {
            const href = item.expandable ? "/learn" : item.href;
            const isActive = href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
            const label = isAr ? item.labelAr : item.label;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary dark:text-primary-light"
                    : "text-text-muted"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
