"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { DEFAULT_SETTINGS, getSettings, setSettings as saveSettings } from "@/lib/storage";
import type { UserSettings } from "@/lib/types";

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  // False until the client has mounted. SettingsSync gates its <html> writes on
  // this so it never clobbers the pre-paint bootstrap with the default before
  // the stored settings are available.
  mounted: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  mounted: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<UserSettings>(() => getSettings());
  // Until the client has mounted, expose DEFAULT_SETTINGS so the first client
  // render matches the server (which has no localStorage and renders the
  // default). Without this, the state initializer reads stored Arabic on the
  // client's first render while the server rendered the English default, and
  // every localized string mismatches (React hydration error #418). The real
  // settings swap in right after mount; the pre-paint bootstrap already set
  // dir/lang on <html>, so only text content settles from default to stored.
  const [mounted, setMounted] = useState(false);
  // Serialized form of the last value known to match storage. The mount
  // re-read below always produces a new object identity for unchanged values,
  // so equality (not identity, and not a skip-first-pass flag) must decide
  // whether anything needs saving; otherwise every page load writes the whole
  // store back and broadcasts a change that never happened.
  const lastPersisted = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
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
    <SettingsContext.Provider value={{ settings: mounted ? settings : DEFAULT_SETTINGS, updateSettings, mounted }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
