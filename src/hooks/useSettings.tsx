"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { getSettings, setSettings as saveSettings } from "@/lib/storage";
import type { UserSettings } from "@/lib/types";

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  reciter: "husary",
  playbackSpeed: 1.0,
  fontSize: "normal",
  darkMode: false,
  showTransliteration: true,
  showTranslation: true,
  language: "en",
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<UserSettings>(() => getSettings());
  const hydrated = useRef(false);

  useEffect(() => {
    setSettingsState(getSettings());
  }, []);

  // Persist from an effect, never inside the updater: StrictMode double-invokes
  // updaters, and the storage write emits the progress change bus, which must
  // not fire mid-render. The first pass is skipped because that value was just
  // read from storage.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
