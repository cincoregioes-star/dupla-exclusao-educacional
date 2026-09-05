const CORE = "dupla-exclusao-core-v12";
const FULL = "dupla-exclusao-full-v12";

const core = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "config.js",
  "auth-institucional.js",
  "dashboard-institucional.js",
  "institutional-controls.js",
  "question-bank.js",
  "manifest.webmanifest",
  "logo-pedro-queiroz.jpg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

const stickers = Array.from({ length: 36 }, (_, i) =>
  `figurinhas/${String(i + 1).padStart(2, "0")}.webp`
);

const game = [
  "game/index.html",
  "game/style.css",
  "game/script.js",
  "game/figurinhas/figurinhas-config.js",
  "game/audio/bomba.mp3",
  "game/audio/click.mp3",
  "game/audio/erro.mp3",
  "game/audio/foguete.mp3",
  "game/audio/fundo.mp3",
  "game/audio/match.mp3",
  "game/audio/pa.mp3",
  "game/audio/sparkle.mp3",
  "game/audio/swipe.mp3",
  "game/audio/vitoria.mp3"
];

const optionalOffline = [
  ...stickers,
  ...game,
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
  event.waitUntil(addIndividually(CORE, core).then(() => self.skipWaiting()));
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
    event.request.mode === "navigate" || /\.(?:html|js|css|json|webmanifest)$/i.test(url.pathname)
  );
  if (isCode) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response.ok) caches.open(CORE).then(cache => cache.put(event.request, response.clone())).catch(() => {});
          return response;
        })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match("index.html")))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if (response.ok && url.origin === self.location.origin) caches.open(FULL).then(cache => cache.put(event.request, response.clone())).catch(() => {});
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
