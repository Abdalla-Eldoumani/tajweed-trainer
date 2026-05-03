"use client";

import { useState, useEffect, useCallback } from "react";
import { getAnalytics, recordAnalyticsEvent } from "@/lib/storage";
import type { AnalyticsEvent, AnalyticsEventType } from "@/lib/types";

// SSR-safe: starts empty, populates on mount. The record() function writes
// straight to localStorage; the local state mirrors it for components that
// want to render insights.
export function useAnalytics() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    setEvents(getAnalytics());
  }, []);

  const record = useCallback((type: AnalyticsEventType, meta?: string) => {
    recordAnalyticsEvent(type, meta);
    setEvents(getAnalytics());
  }, []);

  return { events, record };
}
