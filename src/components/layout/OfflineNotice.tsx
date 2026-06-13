"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

// Slim connectivity pill. The service worker serves already-visited routes from
// cache (lessons and the last-read Mushaf page stay readable offline), so when
// the network drops the app keeps working for opened pages. This sets that
// expectation and auto-hides on reconnect. Shown only while actually offline.
export function OfflineNotice() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Render nothing during SSR (navigator is unknown) and whenever online.
  if (!mounted || !offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100%-1.5rem)] pointer-events-none"
    >
      <div className="flex items-center gap-2 rounded-full border border-accent/45 bg-bg-card dark:bg-bg-card-dark px-3.5 py-1.5 shadow-[0_8px_24px_-12px_rgba(16,20,32,0.35)]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-accent"
          aria-hidden="true"
        >
          <path d="M1 1l22 22" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span className="text-xs font-medium text-text whitespace-nowrap">{t("offline.notice")}</span>
      </div>
    </div>
  );
}
