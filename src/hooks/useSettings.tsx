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
  // Serialized form of the last value known to match storage. The mount
  // re-read below always produces a new object identity for unchanged values,
  // so equality (not identity, and not a skip-first-pass flag) must decide
  // whether anything needs saving; otherwise every page load writes the whole
  // store back and broadcasts a change that never happened.
  const lastPersisted = useRef<string | null>(null);

  useEffect(() => {
    setSettingsState(getSettings());
  }, []);

  // Persist from an effect, never inside the updater: StrictMode double-invokes
  // updaters, and the storage write emits the progress change bus, which must
  // not fire mid-render.
  useEffect(() => {
    const serialized = JSON.stringify(settings);
    if (lastPersisted.current === null || serialized === lastPersisted.current) {
      // First pass (this value was just read from storage) or a re-read whose
      // values already match what is stored: nothing to save.
      lastPersisted.current = serialized;
      return;
    }
    lastPersisted.current = serialized;
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
