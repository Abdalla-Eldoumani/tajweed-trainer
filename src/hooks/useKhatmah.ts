"use client";

import { useCallback, useEffect, useState } from "react";
import { useProgress } from "@/hooks/useProgress";
import { setKhatmah as persistKhatmah, clearKhatmah as clearStored } from "@/lib/storage";
import type { KhatmahPlan } from "@/lib/types";

// The opt-in khatmah plan plus the reader's current page, read from the one
// progress snapshot (useProgress' useSyncExternalStore), so saving a plan or
// reading a new mushaf page re-renders the card through the change bus with no
// manual refresh. The `mounted` flag gates the caller's render: the server
// snapshot has no plan and no lastRead, so gating keeps SSR and the first client
// paint identical (the card never flashes a plan or a stale page on hydration).
export function useKhatmah() {
  const { progress } = useProgress();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const plan = progress.khatmah ?? null;
  // The reader position the planner tracks. With no recorded position the plan
  // sits at its own startPage (the pace lib clamps the page into the plan span),
  // so an untouched reader reads as "just started", never as negative progress.
  const currentPage = progress.lastRead?.page ?? plan?.startPage ?? 1;

  const save = useCallback((next: KhatmahPlan) => {
    persistKhatmah(next);
  }, []);

  const clear = useCallback(() => {
    clearStored();
  }, []);

  return { plan, currentPage, save, clear, mounted };
}
