"use client";

import { useEffect } from "react";
import { SettingsProvider, useSettings } from "@/hooks/useSettings";

function DarkModeSync({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  return <>{children}</>;
}

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <DarkModeSync>{children}</DarkModeSync>
    </SettingsProvider>
  );
}
