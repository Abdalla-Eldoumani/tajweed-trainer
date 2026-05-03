"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useTranslation } from "@/lib/i18n";
import { MODULES } from "@/components/layout/nav-data";

const QuizSession = dynamic(
  () => import("@/components/practice/QuizSession").then((mod) => ({ default: mod.QuizSession })),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />,
  },
);

const VALID_MODULE_IDS = new Set(MODULES.map((m) => m.id));

// Inline "not found" panel rendered when the [module] segment isn't a known
// module id. We render this inline rather than calling Next's notFound()
// because mixing notFound() with client-component hooks triggers React error
// #310 in production builds when navigating between dynamic-segment values.
function ModuleNotFound({ id }: { id: string }) {
  const { t, isAr } = useTranslation();
  return (
    <div className="space-y-6">
      <Link
        href="/practice"
        className="text-sm text-primary dark:text-primary-light hover:underline inline-flex items-center min-h-[44px]"
      >
        {isAr ? "→ " : "← "}
        {t("practice.hub.backToHub")}
      </Link>
      <div className="text-center space-y-3 py-12">
        <p className="text-sm uppercase tracking-wide text-text-muted">404</p>
        <h1 className="font-heading text-2xl font-bold">{t("notFound.title")}</h1>
        <p className="text-sm text-text-muted">
          {t("practice.module.unknown").replace("{id}", id)}
        </p>
      </div>
    </div>
  );
}

export default function ModulePracticePage({ params }: { params: { module: string } }) {
  const { t, isAr } = useTranslation();

  if (!VALID_MODULE_IDS.has(params.module)) {
    return <ModuleNotFound id={params.module} />;
  }

  const mod = MODULES.find((m) => m.id === params.module);
  const label = mod ? (isAr ? mod.labelAr : mod.label) : params.module;

  return (
    <div className="space-y-6">
      <Link
        href="/practice"
        className="text-sm text-primary dark:text-primary-light hover:underline inline-flex items-center min-h-[44px]"
      >
        {isAr ? "→ " : "← "}
        {t("practice.hub.backToHub")}
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-bold">{label}</h1>
        <p className="text-sm text-text-muted mt-2">{t("practice.description")}</p>
      </div>

      <QuizSession key={params.module} moduleFilter={params.module} mode="random" />
    </div>
  );
}
