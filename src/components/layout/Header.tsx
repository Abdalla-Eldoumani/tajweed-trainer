"use client";

import Link from "next/link";
import { useState } from "react";
import { MobileDrawer } from "./MobileDrawer";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/lib/i18n";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <header
        className="md:hidden sticky top-0 z-40 bg-[var(--margin-bg)] text-[var(--margin-text)] border-b border-[var(--margin-line)]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            {/* Locale-dependent wordmark: the server renders the English default
                while the client's first render reads the stored language. Suppress
                on this one text node so React patches it without a hydration warning. */}
            <span className="text-base font-heading font-bold text-[var(--margin-active)]" suppressHydrationWarning>
              {t("app.title")}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-[var(--margin-text)] hover:bg-[var(--margin-hover-bg)]"
              aria-label={t("nav.toggleMenu")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
