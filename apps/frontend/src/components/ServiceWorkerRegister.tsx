"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) that makes the app
// installable and caches the app shell for fast/offline loads. Silently
// no-ops on browsers without service worker support, or in dev if it
// ever fails — this must never block the app from rendering.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    };

    // By the time this effect runs (after hydration), `window`'s load
    // event has often already fired — waiting on it unconditionally means
    // the registration silently never happens. Register immediately if
    // the page is already loaded; otherwise wait for it as normal.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
