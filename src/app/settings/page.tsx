"use client";

import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { useReciters } from "@/hooks/useReciters";
import { resolveReciterIdentifier } from "@/lib/audio-api";
import { exportProgress, importProgress } from "@/lib/storage";
import type { ReciterEdition } from "@/lib/types";
import { cn } from "@/lib/utils";

// Friendly language labels for the optgroup header. Falls back to the ISO
// code in upper case when the language isn't in the table.
const LANGUAGE_LABELS: Record<string, { en: string; ar: string }> = {
  ar: { en: "Arabic", ar: "العربية" },
  en: { en: "English", ar: "الإنجليزية" },
  fr: { en: "French", ar: "الفرنسية" },
  ur: { en: "Urdu", ar: "الأردية" },
  fa: { en: "Persian", ar: "الفارسية" },
};

function languageLabel(code: string, lang: "en" | "ar"): string {
  return LANGUAGE_LABELS[code]?.[lang] ?? code.toUpperCase();
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { t, isAr, lang } = useTranslation();
  const { editions, loading: recitersLoading } = useReciters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState<{ kind: "success" | "error"; key: string } | null>(null);

  const handleExport = () => {
    const data = exportProgress();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tajweed-trainer-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupStatus({ kind: "success", key: "settings.backup.exported" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const ok = importProgress(text);
      setBackupStatus({ kind: ok ? "success" : "error", key: ok ? "settings.backup.imported" : "settings.backup.invalid" });
      if (ok) {
        // Reload so cached hooks (settings, progress) re-read the new state.
        window.setTimeout(() => window.location.reload(), 600);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Group editions by language code, but always pin Arabic first since the
  // two defaults live there and most users expect them at the top. The two
  // defaults (ar.husary, ar.alafasy) keep their position because
  // mergeWithDefaults already prepended them to the list.
  const grouped = useMemo(() => {
    const byLang = new Map<string, ReciterEdition[]>();
    for (const e of editions) {
      const list = byLang.get(e.language) ?? [];
      list.push(e);
      byLang.set(e.language, list);
    }
    const ordered: Array<[string, ReciterEdition[]]> = [];
    if (byLang.has("ar")) ordered.push(["ar", byLang.get("ar")!]);
    Array.from(byLang.entries()).forEach(([code, list]) => {
      if (code !== "ar") ordered.push([code, list]);
    });
    return ordered;
  }, [editions]);

  // Selected value: preserve `husary` / `alafasy` aliases when they're set,
  // otherwise echo the full identifier from settings.
  const selectedValue = settings.reciter;
  const matchedEdition = editions.find(
    (e) => e.identifier === selectedValue || e.identifier === resolveReciterIdentifier(selectedValue),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("settings.title")}</h1>
        <p className="text-sm text-text-muted mt-2">{t("settings.description")}</p>
      </div>

      {/* Language */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">{t("settings.language")}</h2>
        <div className="space-y-2" role="radiogroup" aria-label={t("settings.language")}>
          {([
            { value: "en" as const, label: t("settings.languageEn") },
            { value: "ar" as const, label: t("settings.languageAr") },
          ]).map((lang) => (
            <label
              key={lang.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                settings.language === lang.value
                  ? "bg-primary/10 dark:bg-primary-light/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <input
                type="radio"
                name="language"
                value={lang.value}
                checked={settings.language === lang.value}
                onChange={() => updateSettings({ language: lang.value })}
                className="accent-primary"
                aria-label={lang.label}
              />
              <span className={cn("text-sm font-medium", lang.value === "ar" && "font-arabic")}>{lang.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Reciter */}
      <Card>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="font-heading font-semibold text-sm">{t("settings.reciter")}</h2>
          {recitersLoading && (
            <span className="text-xs text-text-muted" aria-live="polite">
              {t("settings.recitersLoading")}
            </span>
          )}
        </div>
        <select
          value={selectedValue}
          onChange={(e) => updateSettings({ reciter: e.target.value })}
          aria-label={t("settings.reciter")}
          className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark text-sm"
        >
          {grouped.map(([code, list]) => (
            <optgroup key={code} label={languageLabel(code, lang)}>
              {list.map((edition) => (
                <option key={edition.identifier} value={edition.identifier}>
                  {edition.englishName}
                  {edition.identifier === "ar.husary" && ` (${t("settings.recitersDefault")})`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {matchedEdition && matchedEdition.language === "ar" && (
          <p className="text-xs text-text-muted mt-2 font-arabic" dir="rtl" lang="ar">
            {matchedEdition.name}
          </p>
        )}
        <p className="text-xs text-text-muted mt-2">
          {t("settings.recitersHelp")}
        </p>
      </Card>

      {/* Playback Speed */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">{t("settings.playbackSpeed")}</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("settings.playbackSpeed")}>
          {[0.5, 0.75, 1.0].map((speed) => (
            <button
              key={speed}
              onClick={() => updateSettings({ playbackSpeed: speed })}
              className={cn(
                "px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                settings.playbackSpeed === speed
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
              role="radio"
              aria-checked={settings.playbackSpeed === speed}
              aria-label={`${speed}x speed`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </Card>

      {/* Font Size */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">{t("settings.fontSize")}</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("settings.fontSize")}>
          {([
            { value: "normal", labelKey: "settings.normal" },
            { value: "large", labelKey: "settings.large" },
            { value: "xlarge", labelKey: "settings.xlarge" },
          ] as const).map((size) => (
            <button
              key={size.value}
              onClick={() => updateSettings({ fontSize: size.value })}
              className={cn(
                "px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                settings.fontSize === size.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
              role="radio"
              aria-checked={settings.fontSize === size.value}
              aria-label={t(size.labelKey)}
            >
              {t(size.labelKey)}
            </button>
          ))}
        </div>
      </Card>

      {/* Display Options */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">{t("settings.displayOptions")}</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">{t("settings.showTransliteration")}</span>
            <input
              type="checkbox"
              checked={settings.showTransliteration}
              onChange={(e) => updateSettings({ showTransliteration: e.target.checked })}
              className="accent-primary w-4 h-4"
              aria-label={t("settings.showTransliteration")}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">{t("settings.showTranslation")}</span>
            <input
              type="checkbox"
              checked={settings.showTranslation}
              onChange={(e) => updateSettings({ showTranslation: e.target.checked })}
              className="accent-primary w-4 h-4"
              aria-label={t("settings.showTranslation")}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">{t("settings.darkMode")}</span>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => updateSettings({ darkMode: e.target.checked })}
              className="accent-primary w-4 h-4"
              aria-label={t("settings.darkMode")}
            />
          </label>
        </div>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-2">{t("settings.backup.title")}</h2>
        <p className="text-xs text-text-muted mb-3">{t("settings.backup.description")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            {t("settings.backup.export")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {t("settings.backup.import")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="sr-only"
            aria-hidden="true"
          />
        </div>
        {backupStatus && (
          <p
            className={cn(
              "text-xs mt-2",
              backupStatus.kind === "success" ? "text-primary dark:text-primary-light" : "text-red-600 dark:text-red-400",
            )}
          >
            {t(backupStatus.key)}
          </p>
        )}
      </Card>
    </div>
  );
}
