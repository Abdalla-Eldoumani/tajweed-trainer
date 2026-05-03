"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordAnalyticsEvent } from "@/lib/storage";

// Records a `route.view` event on every navigation. Local-only (writes to
// localStorage); never makes a network call. Mounted once in AppProvider.
export function RouteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;
    recordAnalyticsEvent("route.view", pathname);
  }, [pathname]);

  return null;
}
