const CORE = "dupla-exclusao-core-v9";
const FULL = "dupla-exclusao-full-v9";

const core = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "config.js",
  "dashboard-institucional.js",
  "question-bank.js",
  "manifest.webmanifest",
  "logo-pedro-queiroz.jpg",
  "icon-192.png",
  "icon-512.png"
];

const stickers = Array.from({ length: 36 }, (_, i) =>
  `${String(i + 1).padStart(2, "0")}.webp`
);

const optionalOffline = [
  ...stickers,
  "qrcode_album_dupla_exclusao.png",
  "qrcode-album-dupla-exclusao.png"
];

async function addIndividually(cacheName, assets){
  const cache = await caches.open(cacheName);
  await Promise.allSettled(assets.map(async asset => {
    try {
      const response = await fetch(asset, { cache: "reload" });
      if (response.ok) await cache.put(asset, response.clone());
    } catch (_) {}
  }));
}

self.addEventListener("install", event => {
  event.waitUntil(
    addIndividually(CORE, core).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![CORE, FULL].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isCode = url.origin === self.location.origin && (
    event.request.mode === "navigate" ||
    /\.(?:html|js|css|json|webmanifest)$/i.test(url.pathname)
  );

  if (isCode) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CORE).then(cache => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match("index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if (response.ok && url.origin === self.location.origin) {
        const copy = response.clone();
        caches.open(FULL).then(cache => cache.put(event.request, copy)).catch(() => {});
      }
      return response;
    }))
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "CACHE_OFFLINE_FULL") {
    event.waitUntil(
      addIndividually(FULL, [...core, ...optionalOffline])
        .then(() => self.clients.matchAll({ type: "window" }))
        .then(clients => clients.forEach(client => client.postMessage({ type: "OFFLINE_READY" })))
    );
  }
});
