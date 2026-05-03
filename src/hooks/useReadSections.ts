"use client";

import { useState, useEffect, useCallback } from "react";
import { getReadSections, markSectionRead } from "@/lib/storage";

// Tracks which lesson sections (by anchor slug) the user has scrolled into
// view long enough to count as "read". An IntersectionObserver watches every
// element whose [id] matches one of `sectionIds`. When such an element is
// 40 % visible it's persisted via markSectionRead.
//
// SSR-safe: state stays empty on first render; the effect populates from
// localStorage and wires up the observer after mount.
export function useReadSections(moduleId: string, sectionIds: string[] = []) {
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setReadSet(new Set(getReadSections(moduleId)));
    setMounted(true);
  }, [moduleId]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;
    if (sectionIds.length === 0) return;

    const sectionSet = new Set(sectionIds);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.intersectionRatio < 0.4) continue;
          const slug = entry.target.id;
          if (!slug || !sectionSet.has(slug)) continue;
          setReadSet((prev) => {
            if (prev.has(slug)) return prev;
            markSectionRead(moduleId, slug);
            const next = new Set(prev);
            next.add(slug);
            return next;
          });
        }
      },
      { threshold: [0.4] },
    );

    // Defer one tick so the lesson DOM has settled (especially the dynamic-
    // imported pieces in Makharij and the practice routes).
    const timer = window.setTimeout(() => {
      for (const slug of sectionIds) {
        const el = document.getElementById(slug);
        if (el) observer.observe(el);
      }
    }, 50);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [mounted, moduleId, sectionIds]);

  const markRead = useCallback(
    (sectionId: string) => {
      markSectionRead(moduleId, sectionId);
      setReadSet((prev) => {
        if (prev.has(sectionId)) return prev;
        const next = new Set(prev);
        next.add(sectionId);
        return next;
      });
    },
    [moduleId],
  );

  return {
    readSet,
    readCount: readSet.size,
    markRead,
    mounted,
  };
}
