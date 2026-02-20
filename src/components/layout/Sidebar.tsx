"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MODULES = [
  { id: "makharij", label: "Makharij", labelAr: "مخارج" },
  { id: "noon-sakinah", label: "Noon Sakinah", labelAr: "نون ساكنة" },
  { id: "meem-sakinah", label: "Meem Sakinah", labelAr: "ميم ساكنة" },
  { id: "ghunnah", label: "Ghunnah", labelAr: "غنّة" },
  { id: "qalqalah", label: "Qalqalah", labelAr: "قلقلة" },
  { id: "madd", label: "Madd", labelAr: "مدّ" },
  { id: "laam-raa", label: "Laam & Raa", labelAr: "لام وراء" },
  { id: "tafkheem-tarqeeq", label: "Heavy & Light", labelAr: "تفخيم وترقيق" },
  { id: "waqf", label: "Waqf", labelAr: "وقف" },
];

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/learn", label: "Learn", icon: BookIcon, expandable: true },
  { href: "/practice", label: "Practice", icon: PracticeIcon },
  { href: "/progress", label: "Progress", icon: ProgressIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card dark:bg-bg-card-dark border-t border-gray-200 dark:border-gray-700 z-50">
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

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PracticeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
