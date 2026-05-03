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
        // Registration failure is silent — the app still works without
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

  return null;
}
