"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MedallionOrnament } from "@/components/ui/Ornament";
import { useMemorization } from "@/hooks/useMemorization";
import { useKhatmah } from "@/hooks/useKhatmah";
import { useTranslation } from "@/lib/i18n";
import {
  getCompletedJuz,
  isKhatmahComplete,
  drawCertificate,
  certificateToBlob,
  type CertificateData,
} from "@/lib/certificate";
import { recordCertificate } from "@/lib/storage";
import { toArabicIndic } from "@/lib/utils";

// Today as a local YYYY-MM-DD, computed at render (the app owns the clock, the
// pace lib stays deterministic). "en-CA" yields ISO date order, matching the
// streak and khatmah helpers.
function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

// A fixed, high-resolution canvas so the exported PNG is crisp; the element is
// scaled down with CSS for display. 1200x848 is a calm landscape proportion.
const CANVAS_W = 1200;
const CANVAS_H = 848;

// One selectable milestone: a completed juz (ref = juz number) or the completed
// khatmah (ref = null). The value string is the option's stable form.
type Milestone = { kind: "juz" | "khatmah"; ref: number | null };

function milestoneValue(m: Milestone): string {
  return m.kind === "juz" ? `juz:${m.ref}` : "khatmah";
}

// A self-contained /progress card for the on-device milestone certificate. When a
// juz is fully memorized or a khatmah is complete, the learner picks the
// milestone, sees it rendered on a canvas, and can save it as a PNG. Only a small
// completion record is persisted on save (never the image; EDGE_CASES_V2 line 50).
// Mounted-gated like KhatmahCard so the store-derived UI never flashes on
// hydration (the server has no memorized verses and no plan).
export function MilestoneCertificate() {
  const { t, isAr, dir } = useTranslation();
  const { memorized, mounted: memMounted } = useMemorization();
  const { plan, currentPage, mounted: khatmahMounted } = useKhatmah();
  const headingId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mounted = memMounted && khatmahMounted;

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  // The milestones the learner has actually reached: each fully-memorized juz,
  // then the khatmah when the reader has completed it. Recomputed from the live
  // memorized set / plan, so finishing a juz makes its certificate available with
  // no refresh (the hooks subscribe to the change bus).
  const milestones = useMemo<Milestone[]>(() => {
    if (!mounted) return [];
    const out: Milestone[] = getCompletedJuz(memorized).map((juz) => ({
      kind: "juz" as const,
      ref: juz,
    }));
    if (plan && isKhatmahComplete(plan, currentPage, todayIso())) {
      out.push({ kind: "khatmah", ref: null });
    }
    return out;
  }, [mounted, memorized, plan, currentPage]);

  // The user's explicit pick, or "" before they choose. The effective selection
  // is derived below with a fallback, so there is no effect syncing this back
  // when the milestone list changes (avoids a cascading render): an empty or
  // now-stale pick simply resolves to the first available milestone.
  const [selected, setSelected] = useState<string>("");

  const active = useMemo<Milestone | null>(() => {
    if (milestones.length === 0) return null;
    return milestones.find((m) => milestoneValue(m) === selected) ?? milestones[0];
  }, [milestones, selected]);

  const activeValue = active ? milestoneValue(active) : "";

  // The localized date for the certificate body, in the reader's locale.
  const completedDate = useMemo(() => {
    const d = new Date(`${todayIso()}T00:00:00`);
    return d.toLocaleDateString(isAr ? "ar" : "en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [isAr]);

  // Build the localized lines the canvas draws. The lib holds no display copy;
  // every string comes from i18n here (CONST-01).
  const certificateData = useMemo<CertificateData | null>(() => {
    if (!active) return null;
    const isJuz = active.kind === "juz";
    return {
      kind: active.kind,
      ref: active.ref,
      dateIso: todayIso(),
      dir,
      lines: {
        eyebrow: t("certificate.eyebrow"),
        title: isJuz
          ? t("certificate.juzTitle").replace("{n}", num(active.ref ?? 0))
          : t("certificate.khatmahTitle"),
        subtitle: isJuz ? t("certificate.juzDetail") : t("certificate.khatmahDetail"),
        date: t("certificate.dateLabel").replace("{date}", completedDate),
        app: t("certificate.appName"),
      },
    };
    // `t`/`num` are stable enough for this render; isAr/dir/completedDate capture
    // the locale, and `active` the milestone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dir, isAr, completedDate]);

  // Paint whenever the data changes. Drawing is idempotent (it clears first), so
  // re-running on a language flip or a new selection just repaints.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !certificateData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCertificate(ctx, certificateData, { w: CANVAS_W, h: CANVAS_H });
  }, [certificateData]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const blob = await certificateToBlob(canvas);
    if (!blob) return;
    // Object URL -> temporary <a download> click -> revoke. Entirely in memory;
    // nothing is written to storage but the small completion record below.
    const url = URL.createObjectURL(blob);
    const fileName =
      active.kind === "juz" ? `tajweed-certificate-juz-${active.ref}.png` : "tajweed-certificate-khatmah.png";
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    // Record only that this milestone was reached/exported (never the image).
    recordCertificate({ kind: active.kind, ref: active.ref, dateIso: todayIso() });
  };

  // Before mount, and when nothing is complete, show a calm, non-nagging line.
  if (!mounted || milestones.length === 0) {
    return (
      <section aria-labelledby={headingId}>
        <SectionHeading as="h2" className="mb-4">
          <span id={headingId}>{t("certificate.title")}</span>
        </SectionHeading>
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg-card p-6 sm:p-8 dark:bg-bg-card-dark">
          <MedallionOrnament className="pointer-events-none absolute -top-6 end-[-1.5rem] h-28 w-28 opacity-20" />
          <p className="relative max-w-prose text-body text-text-muted">{t("certificate.empty")}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading as="h2" className="mb-4">
        <span id={headingId}>{t("certificate.title")}</span>
      </SectionHeading>
      <div className="rounded-xl border border-border bg-bg-card p-6 sm:p-8 dark:bg-bg-card-dark">
        <p className="max-w-prose text-body text-text-muted">{t("certificate.intro")}</p>

        {/* Milestone picker: only shown when there is more than one to choose. */}
        {milestones.length > 1 && (
          <label className="mt-5 flex flex-col gap-1 text-micro font-medium text-text-muted">
            {t("certificate.pick")}
            <select
              value={activeValue}
              onChange={(e) => setSelected(e.target.value)}
              aria-label={t("certificate.pick")}
              className="text-small bg-bg-card dark:bg-bg-card-dark border border-gold-light/40 dark:border-gold-dark/30 rounded-lg px-2 py-2 min-h-[44px] max-w-xs"
            >
              {milestones.map((m) => (
                <option key={milestoneValue(m)} value={milestoneValue(m)}>
                  {m.kind === "juz"
                    ? t("certificate.optionJuz").replace("{n}", num(m.ref ?? 0))
                    : t("certificate.optionKhatmah")}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* The rendered certificate. Fixed bitmap size for a crisp export, scaled
            down responsively with CSS; the gold hairline frames the preview. */}
        <div className="mt-6 overflow-hidden rounded-lg border border-gold-light/40 dark:border-gold-dark/30">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            role="img"
            aria-label={t("certificate.canvasLabel")}
            className="block h-auto w-full"
          />
        </div>

        <div className="mt-6">
          <Button variant="primary" onClick={handleSave}>
            {t("certificate.save")}
          </Button>
        </div>
      </div>
    </section>
  );
}
