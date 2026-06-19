"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useMemorization } from "@/hooks/useMemorization";
import { useTranslation } from "@/lib/i18n";
import {
  countInScope,
  versesForJuz,
  versesForRange,
  versesForSurah,
} from "@/lib/memorization-scope";
import { ayahCountForSurah, TOTAL_JUZ } from "@/lib/navigation";
import { clampAyah } from "@/lib/validate";
import { toArabicIndic } from "@/lib/utils";
import surahIndex from "@/data/content/surah-index.json";
import type { SurahHeader } from "@/lib/types";

// Surahs in number order from the bundled index (READ ONLY). The picker shows
// "{number}. {locale name}"; this surface never edits or generates content.
const SURAHS = (surahIndex as SurahHeader[])
  .slice()
  .sort((a, b) => a.number - b.number);

type Scope = "surah" | "juz" | "range";

// The reader's controlled-select look, echoed so the bulk pickers match the rest
// of the app: card ground, gold-hairline border, 8px radius, the 44px touch floor.
const SELECT_CLASS =
  "text-small bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]";

interface BulkMemorizationEntryProps {
  // The disclosure is open-state-controlled by the page so the tracker's
  // empty-state CTA and this surface's own trigger flip the same boolean.
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Inline-disclosure bulk surface on /progress (not a modal, not a route): mark or
// unmark a whole surah, a whole juz, or a verse range in one batched write, with a
// true-delta preview (union for mark, difference for unmark) before the confirm.
// Marking and unmarking share this one surface. Confirm is a single setMany call
// (one store write, one change-bus emit) so a 286-verse op never writes per verse.
export function BulkMemorizationEntry({ open, onOpenChange }: BulkMemorizationEntryProps) {
  const { t, isAr } = useTranslation();
  const { memorized, setMany } = useMemorization();

  const [mode, setMode] = useState<"mark" | "unmark">("mark");
  const [scope, setScope] = useState<Scope>("surah");
  const [surah, setSurah] = useState(1);
  const [juz, setJuz] = useState(1);
  const [rangeSurah, setRangeSurah] = useState(1);
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(1);

  const headingId = useId();
  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));
  const mark = mode === "mark";

  // The enumerated scope verse keys, recomputed only when the active scope/target
  // changes. versesForRange normalizes a reversed range and bounds the end by the
  // surah's real ayah count, so the set can never name a verse that does not exist.
  const scopeVerses = useMemo(() => {
    if (scope === "surah") return versesForSurah(surah);
    if (scope === "juz") return versesForJuz(juz);
    return versesForRange(rangeSurah, rangeFrom, rangeTo);
  }, [scope, surah, juz, rangeSurah, rangeFrom, rangeTo]);

  // The true delta count, honoring set semantics so an overlap never surprises the
  // user: mark counts only the not-yet-memorized verses; unmark counts only those
  // currently memorized. A count, never a list of N chips.
  const delta = useMemo(() => {
    if (mark) return scopeVerses.reduce((n, k) => (memorized.has(k) ? n : n + 1), 0);
    return countInScope(memorized, scopeVerses);
  }, [mark, scopeVerses, memorized]);

  const rangeMax = ayahCountForSurah(rangeSurah);

  const previewText =
    delta === 0
      ? t("memorize.previewNoop")
      : (mark ? t("memorize.previewMark") : t("memorize.previewUnmark")).replace(
          "{n}",
          num(delta),
        );

  const confirmText = (mark ? t("memorize.confirmMark") : t("memorize.confirmUnmark")).replace(
    "{n}",
    num(delta),
  );

  const handleConfirm = () => {
    if (delta === 0) return;
    // One batched write: the store applies key validation, set union/difference,
    // and the 6236 cap inside a single setProgress -> one emit. Marking 286 verses
    // is one write, and the change bus re-renders the headline and breakdown.
    setMany(scopeVerses, mark);
    onOpenChange(false);
  };

  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        {t("memorize.bulkOpen")}
      </Button>

      {open && (
        <div
          role="group"
          aria-labelledby={headingId}
          className="mt-4 rounded-xl border border-border bg-bg-subtle/40 p-4 dark:bg-bg-subtle-dark/40 sm:p-5"
        >
          {/* Mark / unmark mode: both directions live on this one surface. */}
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("memorize.bulkScope")}>
            <Button
              variant={mark ? "primary" : "secondary"}
              size="sm"
              aria-pressed={mark}
              onClick={() => setMode("mark")}
            >
              {t("memorize.modeMark")}
            </Button>
            <Button
              variant={!mark ? "primary" : "secondary"}
              size="sm"
              aria-pressed={!mark}
              onClick={() => setMode("unmark")}
            >
              {t("memorize.modeUnmark")}
            </Button>
          </div>

          {/* Scope chooser: whole surah / whole juz / verse range. */}
          <fieldset className="mt-4">
            <legend id={headingId} className="text-micro font-medium uppercase tracking-wide text-text-muted">
              {t("memorize.bulkScope")}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["surah", "memorize.scopeSurah"],
                  ["juz", "memorize.scopeJuz"],
                  ["range", "memorize.scopeRange"],
                ] as const
              ).map(([value, key]) => (
                <Button
                  key={value}
                  variant={scope === value ? "primary" : "secondary"}
                  size="sm"
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                >
                  {t(key)}
                </Button>
              ))}
            </div>
          </fieldset>

          {/* Target picker swaps with the scope. */}
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {scope === "surah" && (
              <select
                value={surah}
                onChange={(e) => setSurah(Number(e.target.value))}
                className={SELECT_CLASS}
                aria-label={t("memorize.scopeSurah")}
              >
                {SURAHS.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {isAr ? s.nameArabic : s.nameSimple}
                  </option>
                ))}
              </select>
            )}

            {scope === "juz" && (
              <select
                value={juz}
                onChange={(e) => setJuz(Number(e.target.value))}
                className={SELECT_CLASS}
                aria-label={t("memorize.scopeJuz")}
              >
                {Array.from({ length: TOTAL_JUZ }, (_, i) => i + 1).map((j) => (
                  <option key={j} value={j}>
                    {t("mushaf.juz")} {isAr ? toArabicIndic(j) : j}
                  </option>
                ))}
              </select>
            )}

            {scope === "range" && (
              <>
                <select
                  value={rangeSurah}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setRangeSurah(next);
                    // Pull the bounds back into the new surah's real ayah count so
                    // a carried-over value can never name a missing verse.
                    const max = ayahCountForSurah(next);
                    setRangeFrom((f) => Math.min(f, max));
                    setRangeTo((to) => Math.min(to, max));
                  }}
                  className={SELECT_CLASS}
                  aria-label={t("memorize.scopeSurah")}
                >
                  {SURAHS.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {isAr ? s.nameArabic : s.nameSimple}
                    </option>
                  ))}
                </select>
                <label className="flex flex-col gap-1 text-micro font-medium text-text-muted">
                  {t("memorize.rangeFrom")}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={rangeMax}
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(clampAyah(Number(e.target.value)))}
                    className={`${SELECT_CLASS} w-20 tabular-nums`}
                    aria-label={t("memorize.rangeFrom")}
                  />
                </label>
                <label className="flex flex-col gap-1 text-micro font-medium text-text-muted">
                  {t("memorize.rangeTo")}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={rangeMax}
                    value={rangeTo}
                    onChange={(e) => setRangeTo(clampAyah(Number(e.target.value)))}
                    className={`${SELECT_CLASS} w-20 tabular-nums`}
                    aria-label={t("memorize.rangeTo")}
                  />
                </label>
              </>
            )}
          </div>

          {/* Preview: the true delta as a count, with a live region so a screen
              reader hears the number change as the target changes. Never N chips. */}
          <p className="mt-4 text-body tabular-nums" aria-live="polite">
            {previewText}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleConfirm} disabled={delta === 0}>
              {confirmText}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t("progress.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
