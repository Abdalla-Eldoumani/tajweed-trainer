"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useTags } from "@/hooks/useTags";

// Must match MAX_TAG_LENGTH in src/lib/storage.ts. The input enforces it
// client-side as a UX nicety; the storage funnel re-trims and re-caps on write,
// so this is never the security boundary.
const TAG_MAX_LENGTH = 40;

interface TagEditorProps {
  verseKey: string;
}

const TagIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.59 13.41 11 23l-9-9V3h11l7.59 7.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const RemoveIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

// A learner's own short tags for one verse, beside the private note in the
// per-verse panel and on each bookmark row. Local-only (never transmitted,
// never religious content, the user's own labels). Renders the current tags as
// removable chips and a small add control. Reads/writes through useTags (the
// storage funnel + change bus). Gated on `mounted` so stored tags never flash in
// during hydration.
export function TagEditor({ verseKey }: TagEditorProps) {
  const { t } = useTranslation();
  const { getTags, setTags, mounted } = useTags();
  const [draft, setDraft] = useState("");

  if (!mounted) return null;

  const tags = getTags(verseKey);

  const addTag = () => {
    const next = draft.trim();
    if (next.length === 0) return;
    // Ignore a case-insensitive duplicate so a second add is a no-op; the
    // sanitizer dedupes again on write.
    if (tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    setTags(verseKey, [...tags, next]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    setTags(
      verseKey,
      tags.filter((existing) => existing !== tag),
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-text-muted">{t("tags.title")}</h4>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-subtle dark:bg-bg-subtle-dark border border-gold-light/30 dark:border-gold-dark/20 ps-2.5 pe-1 py-1 text-xs">
                <span dir="auto" className="max-w-[12rem] truncate">{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={t("tags.remove").replace("{tag}", tag)}
                  title={t("tags.remove").replace("{tag}", tag)}
                  className="inline-flex items-center justify-center w-6 h-6 -me-0.5 rounded-full text-text-muted hover:text-accent hover:bg-bg-card dark:hover:bg-bg-card-dark transition-colors motion-reduce:transition-none"
                >
                  <RemoveIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-text-muted">{t("tags.empty")}</p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          maxLength={TAG_MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          dir="auto"
          placeholder={t("tags.placeholder")}
          aria-label={t("tags.add")}
          className="min-w-0 flex-1 rounded-lg border border-gold-light/40 dark:border-gold-dark/30 bg-bg-card dark:bg-bg-card-dark px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={draft.trim().length === 0}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light hover:bg-primary/20 text-xs font-medium transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <TagIcon />
          {t("tags.add")}
        </button>
      </div>

      <p className="text-[11px] text-text-muted">{t("tags.privacy")}</p>
    </div>
  );
}
