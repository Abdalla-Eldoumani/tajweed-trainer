"use client";

import { useEffect } from "react";
import { SettingsProvider, useSettings } from "@/hooks/useSettings";
import { PWARegister } from "./PWARegister";
import { RouteAnalytics } from "./RouteAnalytics";

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
      <SettingsSync>{children}</SettingsSync>
    </SettingsProvider>
  );
}
