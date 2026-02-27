let CACHE_NAME = "gdv-cache-dev";

async function getVersion() {
  try {
    const res = await fetch("version.json", { cache: "no-store" });
    const data = await res.json();
    return data.version || "dev";
  } catch {
    return "dev";
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const v = await getVersion();
    CACHE_NAME = `gdv-cache-${v}`;
    self.skipWaiting();
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      "./",
      "./index.html",
      "./app.js",
      "./styles.css",
      "./sections/manifest.json",
      "./version.json"
    ]);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const v = await getVersion();
    const current = `gdv-cache-${v}`;
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => (k !== current ? caches.delete(k) : Promise.resolve()))
    );
    await self.clients.claim();
  })());
});
