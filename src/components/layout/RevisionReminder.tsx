"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useMemorization } from "@/hooks/useMemorization";
import { useMemorizationReviews } from "@/hooks/useMemorizationReviews";
import { useTranslation } from "@/lib/i18n";
import { getMemorizationReviewStats } from "@/lib/memorization-review";
import { shouldNotify, isInstalled, isNotificationSupported } from "@/lib/notification-gate";
import { toArabicIndic } from "@/lib/utils";

// The opt-in local revision reminder. Mounted once in AppProvider,
// renders nothing. On app open it fires ONE best-effort local notification when
// every gate is open (installed PWA + Notification API + permission granted +
// the setting on + verses due). The gating truth is the pure `shouldNotify`; the
// permission is re-read here at fire time (a granted permission can be revoked).
//
// Honest and local: this is a reminder shown when the installed app is opened,
// never a server push — nothing fires while the app is closed. No CSP change
// (the Notification API makes no network request) and no persisted last-notified
// field: a per-session `sessionStorage` guard fires at most once per session, and
// a same-day re-notify in a new session is acceptable for an on-open reminder.
// The body names only a COUNT (via t) — never Quran/hadith text.
export function RevisionReminder() {
  const { settings, mounted: settingsMounted } = useSettings();
  const { memorized, mounted: memorizationMounted } = useMemorization();
  const { reviews } = useMemorizationReviews();
  const { t, isAr } = useTranslation();

  // The opt-in state as it was when the app opened (snapshotted once, below). The
  // reminder is an ON-OPEN reminder — enabling the toggle mid-session must not fire
  // it now (the copy promises a reminder shown when you open the app); it takes
  // effect on the next open. Firing still also requires the toggle to be currently
  // on (a mid-session disable stops it via shouldNotify's live `enabled`).
  const enabledAtOpenRef = useRef<boolean | null>(null);

  // Honest due count over the memorized universe (a verse never self-tested is
  // due immediately); the notification is gated on this being > 0.
  const due = getMemorizationReviewStats(memorized, reviews).due;

  useEffect(() => {
    // Both stores must be hydrated before we trust the setting and the due count.
    if (!settingsMounted || !memorizationMounted) return;

    // Snapshot the persisted opt-in on the first settled pass after hydration.
    if (enabledAtOpenRef.current === null) {
      enabledAtOpenRef.current = !!settings.revisionRemindersEnabled;
    }
    // Only remind for an opt-in that was already on at open (not one toggled on now).
    if (!enabledAtOpenRef.current) return;

    const fire = shouldNotify({
      installed: isInstalled(),
      supported: isNotificationSupported(),
      // Re-read at fire time: a permission granted earlier can be revoked.
      permissionGranted: typeof Notification !== "undefined" && Notification.permission === "granted",
      enabled: !!settings.revisionRemindersEnabled,
      dueCount: due,
    });
    if (!fire) return;

    // Per-session guard so a re-render or route change never re-fires within a
    // session, even as `due` recomputes through the change bus.
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("murajaah-notified")) return;
    sessionStorage.setItem("murajaah-notified", "1");

    const title = t("murajaah.notifyTitle");
    const options: NotificationOptions = {
      body: t("murajaah.notifyBody").replace("{n}", isAr ? toArabicIndic(due) : String(due)),
      // A fixed tag replaces rather than stacks a prior reminder.
      tag: "murajaah-due",
      icon: "/icon.svg",
      badge: "/icon.svg",
      requireInteraction: false,
    };

    // Prefer the service-worker registration path — it is the only one that
    // works on Android Chrome, where `new Notification()` throws ("Illegal
    // constructor"). Fall back to the constructor in a try/catch on engines
    // without an active worker (desktop best-effort). Never throw.
    const swReady = typeof navigator !== "undefined" ? navigator.serviceWorker?.ready : undefined;
    if (swReady) {
      swReady.then((reg) => reg.showNotification(title, options)).catch(() => {});
    } else {
      try {
        new Notification(title, options);
      } catch {
        // Some engines throw on the constructor; a failed reminder is harmless.
      }
    }
  }, [settingsMounted, memorizationMounted, due, settings.revisionRemindersEnabled, t, isAr]);

  return null;
}
