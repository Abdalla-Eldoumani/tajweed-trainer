"use client";

import { useEffect } from "react";

// Registers the service worker in production builds. In development we skip
// registration so HMR doesn't fight a stale precached shell.
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration failure is silent, the app still works without
        // offline support.
      });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  // Ask the browser to keep our local data (bookmarks, progress, resume) from
  // being evicted under storage pressure. Best-effort; a decline is fine and the
  // manual backup in Settings remains the fallback.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage || typeof navigator.storage.persist !== "function") {
      return;
    }
    navigator.storage.persist().catch(() => {});
  }, []);

  return null;
}
