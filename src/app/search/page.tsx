"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ArabicText } from "@/components/ui/ArabicText";
import { useTranslation } from "@/lib/i18n";
import { search, type SearchResult } from "@/lib/search";

const KIND_LABEL: Record<SearchResult["kind"], { en: string; ar: string }> = {
  surah: { en: "Surah", ar: "سورة" },
  module: { en: "Module", ar: "وحدة" },
  rule: { en: "Rule", ar: "حكم" },
  letter: { en: "Letter", ar: "حرف" },
  "waqf-symbol": { en: "Waqf symbol", ar: "رمز وقف" },
};

export default function SearchPage() {
  const { t, isAr } = useTranslation();
  const [query, setQuery] = useState("");
  const results = useMemo(() => search(query, 30), [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("search.title")}</h1>
        <p className="text-sm text-text-muted mt-2">{t("search.subtitle")}</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.title")}
        autoFocus
        className="w-full px-4 py-3 min-h-[48px] rounded-lg border border-gold-light/40 dark:border-gold-dark/30 bg-bg-card dark:bg-bg-card-dark text-base focus:outline-none focus:border-primary"
      />

      {query.trim().length < 2 ? (
        <p className="text-sm text-text-muted">{t("search.hint")}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-text-muted">{t("search.noResults")}</p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {results.map((r) => (
            <li key={r.id}>
              <Link href={r.href} className="block">
                <Card hover className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold">
                        {isAr ? r.title.ar : r.title.en}
                      </h2>
                      {!isAr && r.kind === "surah" && (
                        <ArabicText text={r.title.ar.replace(/^\d+\.\s*/, "")} size="sm" className="text-text-muted" />
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light shrink-0">
                      {isAr ? KIND_LABEL[r.kind].ar : KIND_LABEL[r.kind].en}
                    </span>
                  </div>
                  {r.subtitle && (r.subtitle.en || r.subtitle.ar) && (
                    <p className="text-xs text-text-muted line-clamp-2">
                      {isAr && r.subtitle.ar ? r.subtitle.ar : r.subtitle.en}
                    </p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
