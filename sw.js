const CACHE_NAME = "accessgraph-shell-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle same-origin GET requests
  if (req.method !== "GET") return;

  // Navigation request (e.g., page reload offline)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cachedIndex = await caches.match("./index.html", { ignoreSearch: true });
        if (cachedIndex) return cachedIndex;
        const cachedRoot = await caches.match("./", { ignoreSearch: true });
        if (cachedRoot) return cachedRoot;
        return caches.match(req, { ignoreSearch: true });
      })
    );
    return;
  }

  // Static assets: Cache-first
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache
          return caches.match(req, { ignoreSearch: true });
        });
    })
  );
});
