const CACHE = "bk-v1.0.0"; // <- bei Änderungen hochzählen z.B. bk-v1.0.1
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/assets/logo.png",
  "/apple-touch-icon.png",
  "/assets/wallpapers/wallpapers.json",
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // <-- wichtig, sonst bleibt er "waiting"
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
      await self.clients.claim(); // <-- wichtig, sonst übernimmt er nicht
    })()
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Damit dein Button "Neu laden" den waiting SW aktivieren kann:
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
