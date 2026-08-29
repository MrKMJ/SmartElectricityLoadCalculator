"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const IOS_DISMISS_KEY = "energy.iosInstallHintDismissed";

// Android/desktop Chrome & Edge fire `beforeinstallprompt`, which we can
// trigger programmatically. iOS Safari has no such API — "Add to Home
// Screen" is a manual Share-sheet action there, so we just point it out
// once instead.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(window.navigator.userAgent);
    if (isIos && isSafari && !localStorage.getItem(IOS_DISMISS_KEY)) {
      setShowIosHint(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function dismissIosHint() {
    localStorage.setItem(IOS_DISMISS_KEY, "1");
    setShowIosHint(false);
  }

  if (deferredPrompt) {
    return (
      <button onClick={install} className="btn-secondary !px-3 !py-1.5 text-xs" title="Install as an app">
        ⬇️ Install app
      </button>
    );
  }

  if (showIosHint) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm shadow-lg md:inset-x-auto md:right-4 md:w-80">
        <span>
          Install this app: tap <strong>Share</strong> →{" "}
          <strong>Add to Home Screen</strong>.
        </span>
        <button onClick={dismissIosHint} className="shrink-0 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white" aria-label="Dismiss">
          ✕
        </button>
      </div>
    );
  }

  return null;
}
