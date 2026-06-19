"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/lib/i18n";
import { exportProgress, importProgress } from "@/lib/storage";
import { RECITATIONS, DEFAULT_RECITER_ID, styleGroup, type ReciterStyleGroup } from "@/lib/reciters";
import { getResourceTranslations, getResourceTafsirs } from "@/lib/quran-api";
import { CURATED_TRANSLATIONS, CURATED_TAFSIRS, mergeResources } from "@/lib/reading-resources";
import type { Recitation, TranslationResource } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { t, isAr } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState<{ kind: "success" | "error"; key: string } | null>(null);
  const [reciterQuery, setReciterQuery] = useState("");
  const [translations, setTranslations] = useState<TranslationResource[]>(CURATED_TRANSLATIONS);
  const [tafsirs, setTafsirs] = useState<TranslationResource[]>(CURATED_TAFSIRS);

  // Resource catalogues load from the API when online; offline the curated
  // fallback keeps the selectors usable. English resources only, to keep the
  // lists short for this app.
  useEffect(() => {
    getResourceTranslations()
      .then((list) => {
        const en = list.filter((r) => r.languageName === "english");
        if (en.length) setTranslations(mergeResources(CURATED_TRANSLATIONS, en));
      })
      .catch(() => {});
    getResourceTafsirs()
      .then((list) => {
        const en = list.filter((r) => r.languageName === "english");
        if (en.length) setTafsirs(mergeResources(CURATED_TAFSIRS, en));
      })
      .catch(() => {});
  }, []);

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

  // Reciters grouped into the two display styles (Mujawwad, then Murattal),
  // narrowed by the search query against the English or Arabic name or style.
  // The selected reciter always stays in the list so the control never loses
  // its value while filtering.
  const selectedValue = settings.reciter;
  const reciterView = useMemo(() => {
    const q = reciterQuery.trim();
    const ql = q.toLowerCase();
    const matchesQuery = (r: Recitation) =>
      r.nameEn.toLowerCase().includes(ql) || r.nameAr.includes(q) || (r.style ?? "").toLowerCase().includes(ql);
    const queryHits = q === "" ? RECITATIONS : RECITATIONS.filter(matchesQuery);
    const visible = q === "" ? RECITATIONS : RECITATIONS.filter((r) => r.id === selectedValue || matchesQuery(r));
    const groups: Array<{ key: ReciterStyleGroup; labelKey: string; list: Recitation[] }> = [
      { key: "mujawwad", labelKey: "settings.reciterStyleMujawwad", list: [] },
      { key: "murattal", labelKey: "settings.reciterStyleMurattal", list: [] },
    ];
    for (const r of visible) groups.find((x) => x.key === styleGroup(r))?.list.push(r);
    return { groups: groups.filter((g) => g.list.length > 0), noResults: q !== "" && queryHits.length === 0 };
  }, [reciterQuery, selectedValue]);

  const reciterLabel = (r: Recitation): string => {
    const base = isAr ? r.nameAr : r.nameEn;
    const styled = r.style ? `${base} — ${r.style}` : base;
    return r.id === DEFAULT_RECITER_ID ? `${styled} (${t("settings.recitersDefault")})` : styled;
  };

  // Keep the saved id selectable even if it is not in the loaded catalogue.
  const ensurePresent = (list: TranslationResource[], id: number): TranslationResource[] =>
    list.some((r) => r.id === id) ? list : [{ id, name: `#${id}`, authorName: "", languageName: "" }, ...list];

  // One source for both segmented controls (playback speed, font size) so their
  // state classes stay identical. The active branch mirrors the primary Button:
  // lapis fill on vellum, gold leaf with navy ink at night.
  const segChip = (active: boolean) =>
    cn(
      "px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
      active
        ? "bg-primary text-on-primary hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep"
        : "bg-bg-subtle text-text dark:bg-bg-subtle-dark dark:text-text-dark hover:bg-cream-dark dark:hover:bg-bg-card-dark"
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
                  : "hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark"
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
        <h2 className="font-heading font-semibold text-sm mb-3">{t("settings.reciter")}</h2>
        <input
          type="search"
          value={reciterQuery}
          onChange={(e) => setReciterQuery(e.target.value)}
          placeholder={t("settings.reciterSearch")}
          aria-label={t("settings.reciterSearch")}
          className="w-full mb-2 px-3 py-2 min-h-[44px] rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark text-sm"
        />
        <select
          value={selectedValue}
          onChange={(e) => updateSettings({ reciter: e.target.value })}
          aria-label={t("settings.reciter")}
          className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark text-sm"
        >
          {reciterView.groups.map((group) => (
            <optgroup key={group.key} label={t(group.labelKey)}>
              {group.list.map((r) => (
                <option key={r.id} value={r.id}>
                  {reciterLabel(r)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {reciterView.noResults && (
          <p className="text-xs text-text-muted mt-2">{t("settings.reciterNoResults")}</p>
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
              className={segChip(settings.playbackSpeed === speed)}
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
              className={segChip(settings.fontSize === size.value)}
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

      {/* Reading depth */}
      <Card>
        <h2 className="font-heading font-semibold text-sm mb-3">{t("settings.readingDepth")}</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">{t("settings.translationResource")}</span>
            <select
              value={settings.translationId ?? 20}
              onChange={(e) => updateSettings({ translationId: Number(e.target.value) })}
              aria-label={t("settings.translationResource")}
              className="w-full mt-1 px-3 py-2 min-h-[44px] rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark text-sm"
            >
              {ensurePresent(translations, settings.translationId ?? 20).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm">{t("settings.tafsirResource")}</span>
            <select
              value={settings.tafsirId ?? 169}
              onChange={(e) => updateSettings({ tafsirId: Number(e.target.value) })}
              aria-label={t("settings.tafsirResource")}
              className="w-full mt-1 px-3 py-2 min-h-[44px] rounded-lg border border-gold-light/30 dark:border-gold-dark/20 bg-bg-card dark:bg-bg-card-dark text-sm"
            >
              {ensurePresent(tafsirs, settings.tafsirId ?? 169).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">{t("settings.showWordByWord")}</span>
            <input
              type="checkbox"
              checked={!!settings.showWordByWord}
              onChange={(e) => updateSettings({ showWordByWord: e.target.checked })}
              className="accent-primary w-4 h-4"
              aria-label={t("settings.showWordByWord")}
            />
          </label>

          <p className="text-xs text-text-muted">{t("settings.resourceOnline")}</p>
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
            tabIndex={-1}
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
