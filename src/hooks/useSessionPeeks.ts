"use client";

import { useState, useEffect } from "react";
import { getSessionPeeks, recordPeek, resetSessionPeeks } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";

// The per-session recall peek/hint state (`sessionPeekUsed`, "surah:ayah" ->
// times peeked). Local-only, never transmitted, never religious content. Empty
// initial state for SSR/CSR parity; the effect seeds from storage on mount.
//
// Read in MemorizedReview to gate the hint control and the honest grade cap, and
// written when the learner spends a hint. Like useVerseNotes/useTags it holds NO
// arithmetic and NO budget policy: the component calls the pure peekRemaining /
// wasPeeked from @/lib/peek-budget against `peeks`. It subscribes to the progress
// change bus so a recordPeek/resetSessionPeeks write refreshes every mounted
// consumer without prop-drilling.
export function useSessionPeeks() {
  const [peeks, setPeeks] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPeeks(getSessionPeeks());
    setMounted(true);
    return subscribeProgressChanged(() => setPeeks(getSessionPeeks()));
  }, []);

  return { peeks, mounted, record: recordPeek, reset: resetSessionPeeks };
}
