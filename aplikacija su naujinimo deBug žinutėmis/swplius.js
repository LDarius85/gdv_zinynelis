const CACHE_NAME = "v3.1";
const ASSETS = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "icon.webp"
];

self.addEventListener("install", event => {
  console.log("[SW] Install event – cache'inam assets");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // NESKUBINAM skipWaiting
});

self.addEventListener("activate", event => {
  console.log("[SW] Activate event – trinam senus cache");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log("[SW] Trinam seną cache:", k);
        return caches.delete(k);
      }))
    ).then(() => {
      console.log("[SW] Claiminam klientus");
      return self.clients.claim();
    })
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.action === "skipWaiting") {
    console.log("[SW] Gauta skipWaiting komanda iš app");
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      if (resp) {
        console.log("[SW] Servinam iš cache:", event.request.url);
        return resp;
      }
      console.log("[SW] Fetchinam iš tinklo:", event.request.url);
      return fetch(event.request);
    })
  );
});
