// Minimal service worker for installability + app-shell caching.
// Deliberately does NOT cache API responses — load calculations, bills, and
// sizing results must always come from the network; caching them would
// silently show stale/wrong numbers. This only makes the *app itself*
// (static JS/CSS/icons, and a friendly offline page) load instantly and
// work when the network is briefly unavailable.

const CACHE_VERSION = "v1";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept mutating requests

  const url = new URL(request.url);

  // Cross-origin requests (the API, Open-Meteo, etc.) — always go to the
  // network untouched. Never cache API data.
  if (url.origin !== self.location.origin) return;

  // Page navigations: network-first, falling back to a cached copy, then
  // to the offline page — so a flaky connection doesn't just show a blank
  // browser error screen.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Static assets (Next.js build output, icons, fonts): cache-first, with
  // the network response saved for next time.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
