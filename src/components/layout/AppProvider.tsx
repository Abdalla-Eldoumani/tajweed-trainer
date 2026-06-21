"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SettingsProvider, useSettings } from "@/hooks/useSettings";
import { PWARegister } from "./PWARegister";
import { RouteAnalytics } from "./RouteAnalytics";
import { OfflineNotice } from "./OfflineNotice";
import { PlayerHost } from "@/components/ui/PlayerHost";
import { MiniPlayer } from "@/components/ui/MiniPlayer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

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
  const { settings, mounted } = useSettings();

  // The pre-paint bootstrap in layout.tsx already set data-theme, lang and dir
  // from storage before first paint. Until the provider mounts, settings is the
  // default, so these effects must NOT run — applying the default would clobber
  // the bootstrap and flash the theme/direction. After mount they apply the
  // real values (a no-op vs the bootstrap) and thereafter react to user changes.
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const lang = settings.language ?? "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [settings.language, mounted]);

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
      <OnboardingTour />
    </SettingsProvider>
  );
}
