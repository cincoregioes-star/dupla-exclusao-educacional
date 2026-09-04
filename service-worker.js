const CORE = "dupla-exclusao-core-v4";
const FULL = "dupla-exclusao-full-v4";

const core = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "config.js",
  "question-bank.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "logo-pedro-queiroz.jpg"
];

const stickers = Array.from({ length: 36 }, (_, i) =>
  `figurinhas/${String(i + 1).padStart(2, "0")}.webp`
);

const fullOffline = [
  ...core,
  ...stickers,
  "game/index.html",
  "qrcode_album_dupla_exclusao.png",
  "qrcode-album-dupla-exclusao.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CORE)
      .then(cache => cache.addAll(core))
      .then(() => self.skipWaiting())
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
  event.respondWith(
    caches.match(event.request).then(hit =>
      hit || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CORE).then(cache => cache.put(event.request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match("./index.html"))
    )
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "CACHE_OFFLINE_FULL") {
    event.waitUntil(
      caches.open(FULL)
        .then(cache => cache.addAll(fullOffline))
        .then(() => self.clients.matchAll({ type: "window" }))
        .then(clients => clients.forEach(client => client.postMessage({ type: "OFFLINE_READY" })))
        .catch(err => console.warn("Falha ao preparar cache offline completo:", err))
    );
  }
});
