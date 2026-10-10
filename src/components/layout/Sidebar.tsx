"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MODULES, NAV_ITEMS, ChevronIcon } from "./nav-data";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/lib/i18n";

// Eight-point star, the khatim motif that marks verse ends and frame corners
// across the app's ornaments. Drawn as two rotated squares.
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <rect x="6.2" y="6.2" width="11.6" height="11.6" />
    <rect x="6.2" y="6.2" width="11.6" height="11.6" transform="rotate(45 12 12)" />
  </svg>
);

export function Sidebar() {
  const pathname = usePathname();
  const [learnExpanded, setLearnExpanded] = useState(pathname.startsWith("/learn"));
  const { t, isAr } = useTranslation();

  return (
    <>
      {/* Desktop sidebar */}
      {/* The sidebar is the illuminated margin: a constant navy band with a
          gold hairline and gold accents in both themes, so the vellum content
          column reads as the manuscript page beside it. */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen fixed top-0 bg-[var(--margin-bg)] text-[var(--margin-text)] border-e border-[var(--margin-line)] overflow-y-auto sidebar-desktop inset-inline-start-0">
        <div className="p-5 border-b border-[var(--margin-line)]">
          <Link href="/" className="block">
            <h1 className="flex items-center gap-2 text-lg font-heading font-bold text-[var(--margin-active)]">
              <StarIcon className="shrink-0 opacity-80" />
              {/* The wordmark text is locale-dependent: the server resolves the
                  English default (no localStorage) while the client's first
                  render reads the stored language. Suppress on this one text
                  node so React patches it to the client value with no warning. */}
              <span suppressHydrationWarning>{t("app.title")}</span>
            </h1>
            <p className="text-sm font-arabic text-[var(--margin-muted)] mt-0.5" dir="rtl" lang="ar">
              {t("app.titleAr")}
            </p>
          </Link>
          <div className="mt-3">
            <LanguageToggle />
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label={t("nav.sidebar")}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

            const label = isAr ? item.labelAr : item.label;

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(e) => {
                    if (item.expandable) {
                      e.preventDefault();
                      setLearnExpanded(!learnExpanded);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--margin-active-bg)] text-[var(--margin-active)]"
                      : "text-[var(--margin-muted)] hover:bg-[var(--margin-hover-bg)] hover:text-[var(--margin-text)]"
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
                        "flex items-center px-3 py-1.5 min-h-[44px] rounded text-xs font-medium transition-colors",
                        pathname === "/learn"
                          ? "text-[var(--margin-active)]"
                          : "text-[var(--margin-muted)] hover:text-[var(--margin-text)]"
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
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded text-xs transition-colors",
                            moduleActive
                              ? "text-[var(--margin-active)] font-medium"
                              : "text-[var(--margin-muted)] hover:text-[var(--margin-text)]"
                          )}
                        >
                          <span className="flex-1">{isAr ? m.labelAr : m.label}</span>
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
        className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--margin-bg)] border-t border-[var(--margin-line)] z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={t("nav.bottomTabs")}
      >
        <div className="flex items-stretch justify-around h-16">
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
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px] px-1 py-1 text-[0.6875rem] font-medium transition-colors",
                  isActive
                    ? "text-[var(--margin-active)]"
                    : "text-[var(--margin-muted)]"
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
