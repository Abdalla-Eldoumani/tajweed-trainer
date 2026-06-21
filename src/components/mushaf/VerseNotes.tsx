"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useVerseNotes } from "@/hooks/useVerseNotes";
import { toArabicIndic } from "@/lib/utils";
import { TagEditor } from "./TagEditor";

// Must match MAX_VERSE_NOTE_LENGTH in src/lib/storage.ts. The textarea enforces
// it client-side for live feedback; the storage funnel re-trims and re-caps on
// write, so this constant is a UX nicety, never the security boundary.
const NOTE_MAX_LENGTH = 1000;
// Show the remaining-characters counter only as the user approaches the cap, so
// the affordance stays calm for a short note.
const COUNTER_THRESHOLD = 100;

interface VerseNotesProps {
  verseKey: string;
}

const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

// A learner's own private note for one verse, inside the reading-depth panel.
// Local-only (never transmitted, never religious content, the user's own
// words). Collapsed by default to keep the panel calm; expands to a textarea
// that saves on blur and via an explicit Save control. Gated on `mounted` so the
// stored note never flashes in during hydration.
export function VerseNotes({ verseKey }: VerseNotesProps) {
  const { t, isAr } = useTranslation();
  const { getNote, setNote, mounted } = useVerseNotes();

  const stored = getNote(verseKey);
  const hasNote = stored.length > 0;

  // Open automatically when a note already exists so the learner sees it without
  // a second tap; collapsed when there is none (the "Add a note" affordance).
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(stored);
  const [justSaved, setJustSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Re-sync to the stored note whenever the verse changes or the stored value
  // changes underneath us (another consumer wrote it). Keying the component by
  // verseKey at the call site would also work; this keeps it robust if it is
  // ever reused without a key.
  useEffect(() => {
    setDraft(stored);
    setOpen(stored.length > 0);
    setJustSaved(false);
    // Intentionally depends on verseKey (not `stored`) so typing a draft is not
    // clobbered by the change-bus re-read on each keystroke's eventual save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseKey]);

  if (!mounted) return null;

  const save = () => {
    // No-op write is cheap, but guard so we do not flash "Saved" when nothing
    // changed (e.g. blur right after open with no edit).
    if (draft.trim() === stored) return;
    setNote(verseKey, draft);
    setJustSaved(true);
  };

  const clear = () => {
    setNote(verseKey, "");
    setDraft("");
    setJustSaved(false);
    setOpen(false);
  };

  const openEditor = () => {
    setOpen(true);
    // Focus the textarea on the next frame, once it is in the DOM.
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const remaining = NOTE_MAX_LENGTH - draft.length;
  const showCounter = remaining <= COUNTER_THRESHOLD;
  const counterText = t("notes.charsLeft").replace(
    "{n}",
    isAr ? toArabicIndic(remaining) : String(remaining),
  );

  const noteUi = !open ? (
    <button
      type="button"
      onClick={openEditor}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary dark:text-primary-light hover:underline underline-offset-2"
    >
      <NoteIcon />
      {hasNote ? t("notes.edit") : t("notes.add")}
    </button>
  ) : (
    <div className="rounded-lg border border-gold-light/30 dark:border-gold-dark/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-text-muted">{t("notes.title")}</h4>
        {hasNote && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] font-medium text-accent hover:underline underline-offset-2"
          >
            {t("notes.clear")}
          </button>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={draft}
        maxLength={NOTE_MAX_LENGTH}
        onChange={(e) => {
          setDraft(e.target.value);
          if (justSaved) setJustSaved(false);
        }}
        onBlur={save}
        rows={3}
        dir="auto"
        placeholder={t("notes.placeholder")}
        aria-label={t("notes.title")}
        className="w-full resize-y rounded-lg border border-gold-light/40 dark:border-gold-dark/30 bg-bg-card dark:bg-bg-card-dark px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-text-muted">{t("notes.privacy")}</p>
        {showCounter && (
          <span className="text-[11px] tabular-nums text-text-muted shrink-0">{counterText}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light hover:bg-primary/20 text-xs font-medium transition-colors motion-reduce:transition-none"
        >
          {t("notes.save")}
        </button>
        {justSaved && (
          <span className="text-[11px] text-text-muted" role="status">
            {t("notes.saved")}
          </span>
        )}
      </div>
    </div>
  );

  // The note and the tags are both the learner's own private per-verse metadata;
  // they sit together in the per-verse panel. TagEditor is mounted-gated on its
  // own hook, so it renders independently of the note's open/closed state.
  return (
    <div className="space-y-3">
      {noteUi}
      <TagEditor verseKey={verseKey} />
    </div>
  );
}
