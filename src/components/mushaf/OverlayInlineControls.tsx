"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/hooks/useSettings";
import { getResourceTranslations } from "@/lib/quran-api";
import { CURATED_TRANSLATIONS, mergeResources } from "@/lib/reading-resources";
import { ReciterSelect } from "@/components/ui/ReciterSelect";
import { cn } from "@/lib/utils";
import type { TranslationResource } from "@/lib/types";

// The playback-speed steps, the same set the Settings speed control offers.
const SPEEDS = [0.5, 0.75, 1.0] as const;

// Saheeh International — the Settings default translation id, used as the fallback
// when none is saved so the dropdown always has a concrete value.
const DEFAULT_TRANSLATION_ID = 20;

// The three inline controls for the verse overlay: a grouped-by-style reciter
// dropdown, a speed segmented group, and a translation-source dropdown. Each
// reads AND writes the SAME settings the Settings page uses through the one
// useSettings funnel, so Settings and the overlay are two views of one store and
// stay in sync with no extra wiring. This component writes settings ONLY: it
// owns no playback path and constructs no <audio> — the one player engine reads
// settings.reciter / settings.playbackSpeed on the next play, and the mounted
// reading-depth panel re-fetches when settings.translationId changes.
export function OverlayInlineControls() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();

  // The only local state is the resource catalogue list (not a setting): seeded
  // with the curated fallback so the dropdown is usable offline, replaced with
  // the live English /resources list when online. The saved id lives in
  // settings, never mirrored here.
  const [translations, setTranslations] = useState<TranslationResource[]>(CURATED_TRANSLATIONS);

  useEffect(() => {
    getResourceTranslations()
      .then((list) => {
        const en = list.filter((r) => r.languageName === "english");
        if (en.length) setTranslations(mergeResources(CURATED_TRANSLATIONS, en));
      })
      .catch(() => {});
  }, []);

  // Keep the saved id selectable even if it is not in the loaded catalogue, so
  // the controlled select never loses its value (identical to Settings').
  const ensurePresent = (list: TranslationResource[], id: number): TranslationResource[] =>
    list.some((r) => r.id === id) ? list : [{ id, name: `#${id}`, authorName: "", languageName: "" }, ...list];

  const translationId = settings.translationId ?? DEFAULT_TRANSLATION_ID;

  // The speed chip state classes mirror the overlay's repeat/gap chips so the
  // section reads in the same visual language: the active step carries the lapis
  // (gold at night) accent, the rest are quiet gold-hairline outlines.
  const speedChip = (active: boolean) =>
    cn(
      "min-w-[44px] min-h-[36px] px-3 rounded-lg text-small font-medium tabular-nums border transition-colors motion-reduce:transition-none",
      active
        ? "bg-primary/15 text-primary dark:text-primary-light border-primary/40"
        : "bg-bg-card dark:bg-bg-card-dark text-text-muted border-gold-light/40 dark:border-gold-dark/30 hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark",
    );

  const labelClass = "text-micro font-medium text-text-muted";

  return (
    <section aria-label={t("inlineControls.title")} className="space-y-3">
      <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
        {t("inlineControls.title")}
      </p>

      {/* Reciter: the shared grouped-by-style dropdown, bound straight to
          settings.reciter. This is the only reciter state — no local mirror. */}
      <label className="flex flex-col gap-1">
        <span className={labelClass}>{t("inlineControls.reciter")}</span>
        <ReciterSelect
          value={settings.reciter}
          onChange={(id) => updateSettings({ reciter: id })}
          label={t("inlineControls.reciter")}
        />
      </label>

      {/* Speed: a segmented group over the existing steps, writing
          settings.playbackSpeed. No local speed state. */}
      <div className="flex flex-col gap-1">
        <span className={labelClass}>{t("inlineControls.speed")}</span>
        <div className="flex flex-wrap gap-1.5" aria-label={t("inlineControls.speed")}>
          {SPEEDS.map((speed) => {
            const active = settings.playbackSpeed === speed;
            return (
              <button
                key={speed}
                type="button"
                onClick={() => updateSettings({ playbackSpeed: speed })}
                aria-pressed={active}
                aria-label={`${speed}x`}
                className={speedChip(active)}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>

      {/* Translation source: the same resource list Settings uses, bound to
          settings.translationId. Only the id is written; Phase 7 owns the
          refetch correctness. */}
      <label className="flex flex-col gap-1">
        <span className={labelClass}>{t("inlineControls.translation")}</span>
        <select
          value={translationId}
          onChange={(e) => updateSettings({ translationId: Number(e.target.value) })}
          aria-label={t("inlineControls.translation")}
          className="w-full text-xs bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]"
        >
          {ensurePresent(translations, translationId).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
