"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MODULES, NAV_ITEMS, ChevronIcon } from "./nav-data";

export function Sidebar() {
  const pathname = usePathname();
  const [learnExpanded, setLearnExpanded] = useState(pathname.startsWith("/learn"));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-bg-card dark:bg-bg-card-dark border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <Link href="/" className="block">
            <h1 className="text-lg font-heading font-bold text-primary dark:text-primary-light">
              Tajweed Trainer
            </h1>
            <p className="text-sm font-arabic text-text-muted mt-0.5" dir="rtl" lang="ar">
              تجويد القرآن
            </p>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

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
                  <span className="flex-1">{item.label}</span>
                  {item.expandable && (
                    <ChevronIcon className={cn("w-4 h-4 transition-transform", learnExpanded && "rotate-90")} />
                  )}
                </Link>

                {item.expandable && learnExpanded && (
                  <div className="ml-8 mt-1 space-y-0.5">
                    <Link
                      href="/learn"
                      className={cn(
                        "block px-3 py-1.5 rounded text-xs font-medium transition-colors",
                        pathname === "/learn"
                          ? "text-primary dark:text-primary-light"
                          : "text-text-muted hover:text-text dark:hover:text-text-dark"
                      )}
                    >
                      All Modules
                    </Link>
                    {MODULES.map((m) => {
                      const moduleActive = pathname === `/learn/${m.id}`;
                      return (
                        <Link
                          key={m.id}
                          href={`/learn/${m.id}`}
                          className={cn(
                            "block px-3 py-1.5 rounded text-xs transition-colors",
                            moduleActive
                              ? "text-primary font-medium dark:text-primary-light"
                              : "text-text-muted hover:text-text dark:hover:text-text-dark"
                          )}
                        >
                          {m.label}
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
        className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card dark:bg-bg-card-dark border-t border-gray-200 dark:border-gray-700 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.filter((i) => !i.expandable || i.href === "/learn").map((item) => {
            const href = item.expandable ? "/learn" : item.href;
            const isActive = href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

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
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
