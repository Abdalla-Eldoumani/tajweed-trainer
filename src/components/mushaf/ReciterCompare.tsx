"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useSettings } from "@/hooks/useSettings";
import { usePlayer } from "@/hooks/usePlayer";
import { RECITATIONS, DEFAULT_RECITER_ID, getRecitation, styleGroup, type ReciterStyleGroup } from "@/lib/reciters";
import type { ReciterId, Recitation } from "@/lib/types";

interface ReciterCompareProps {
  surah: number;
  ayah: number;
  surahName: string | null;
}

// The reciter catalogue grouped into the two display styles (Mujawwad, then
// Murattal), mirroring the settings selector so both controls read the same way.
// Derived once at module load from the static catalogue, never per render.
const RECITER_GROUPS: Array<{ key: ReciterStyleGroup; labelKey: string; list: Recitation[] }> = (() => {
  const out: Array<{ key: ReciterStyleGroup; labelKey: string; list: Recitation[] }> = [
    { key: "mujawwad", labelKey: "settings.reciterStyleMujawwad", list: [] },
    { key: "murattal", labelKey: "settings.reciterStyleMurattal", list: [] },
  ];
  for (const r of RECITATIONS) out.find((g) => g.key === styleGroup(r))?.list.push(r);
  return out.filter((g) => g.list.length > 0);
})();

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={open ? "rotate-90 transition-transform" : "transition-transform"}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// A grouped reciter selector. Declared at module scope (not inside the parent's
// render) so it keeps a stable component identity and never resets its select
// state between renders. The selected id is always kept present as an option so
// a controlled value is never lost.
function ReciterSelect({
  value,
  onChange,
  label,
}: {
  value: ReciterId;
  onChange: (id: ReciterId) => void;
  label: string;
}) {
  const { t, isAr } = useTranslation();
  const known = getRecitation(value);
  const reciterLabel = (r: Recitation): string => {
    const base = isAr ? r.nameAr : r.nameEn;
    return r.style ? `${base}, ${r.style}` : base;
  };
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="w-full text-xs bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px]"
    >
      {!known && <option value={value}>{value}</option>}
      {RECITER_GROUPS.map((group) => (
        <optgroup key={group.key} label={t(group.labelKey)}>
          {group.list.map((r) => (
            <option key={r.id} value={r.id}>
              {reciterLabel(r)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// Pick a sensible default for the second reciter: the catalogue default if it is
// not already reciter A, otherwise the first reciter that differs. Guarantees A
// and B start different so the compare is meaningful on first open.
function otherReciter(a: ReciterId): ReciterId {
  if (a !== DEFAULT_RECITER_ID) return DEFAULT_RECITER_ID;
  const different = RECITATIONS.find((r) => r.id !== a);
  return different ? different.id : a;
}

// Reciter A/B compare for the reading-depth panel: hear the SAME verse by two
// reciters back to back to compare their recitation. A power feature for
// learners, tucked behind a collapsible disclosure so it never clutters the main
// reading experience. Playback goes through the ONE global engine
// (usePlayer.playVerse), no second <audio> element, no new audio path, so a
// failed load surfaces through the existing playback-surface error line exactly
// like any other tap.
export function ReciterCompare({ surah, ayah, surahName }: ReciterCompareProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);

  // Selections are in-memory only (no storage): default A to the user's current
  // reciter and B to a sensible different one. Seeded once; the user can change
  // either selector while the panel is open.
  const [reciterA, setReciterA] = useState<ReciterId>(settings.reciter);
  const [reciterB, setReciterB] = useState<ReciterId>(() => otherReciter(settings.reciter));

  // Play this verse by the chosen reciter through the single engine. playVerse
  // sets status "loading" synchronously, so the playback surface shows feedback
  // within 100ms and any load failure surfaces there (audio.unavailable).
  const play = (reciter: ReciterId) => {
    usePlayer.getState().playVerse(surah, ayah, {
      reciter,
      speed: settings.playbackSpeed,
      surahName,
    });
  };

  const playPill =
    "inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light hover:bg-primary/20 text-xs font-medium transition-colors motion-reduce:transition-none";

  return (
    <div className="rounded-lg border border-gold-light/30 dark:border-gold-dark/20 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary dark:hover:text-primary-light"
      >
        <ChevronIcon open={open} />
        {t("recompare.title")}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] text-text-muted">{t("recompare.hint")}</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Reciter A */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-text-muted">{t("recompare.reciterA")}</span>
              <ReciterSelect value={reciterA} onChange={setReciterA} label={t("recompare.reciterA")} />
              <button type="button" onClick={() => play(reciterA)} aria-label={t("recompare.playA")} className={playPill}>
                <PlayIcon />
                {t("recompare.playA")}
              </button>
            </div>
            {/* Reciter B */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-text-muted">{t("recompare.reciterB")}</span>
              <ReciterSelect value={reciterB} onChange={setReciterB} label={t("recompare.reciterB")} />
              <button type="button" onClick={() => play(reciterB)} aria-label={t("recompare.playB")} className={playPill}>
                <PlayIcon />
                {t("recompare.playB")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
