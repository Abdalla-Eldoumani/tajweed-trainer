"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SettingsProvider, useSettings } from "@/hooks/useSettings";
import { PWARegister } from "./PWARegister";
import { RouteAnalytics } from "./RouteAnalytics";
import { OfflineNotice } from "./OfflineNotice";
import { PlayerHost } from "@/components/ui/PlayerHost";
import { MiniPlayer } from "@/components/ui/MiniPlayer";

// The mushaf reader renders its own reader-scoped playback surface, so the
// global floating MiniPlayer is suppressed there to keep exactly one transport
// on that route. PlayerHost (the single <audio>) stays mounted everywhere, so
// audio started in the reader keeps playing if the user navigates away and the
// MiniPlayer reappears off the mushaf. Only the visibility is gated, never the
// engine. This small wrapper subscribes to the pathname so the rest of the
// provider tree does not re-render on navigation.
function GlobalMiniPlayer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/mushaf")) return null;
  return <MiniPlayer />;
}

function SettingsSync({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  useEffect(() => {
    const lang = settings.language ?? "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [settings.language]);

  return <>{children}</>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <PWARegister />
      <RouteAnalytics />
      <OfflineNotice />
      <SettingsSync>{children}</SettingsSync>
      <PlayerHost />
      <GlobalMiniPlayer />
    </SettingsProvider>
  );
}
