// =====================================================
//  Service worker – a böngésző a háttérben futtatja
//  Stratégia: "először hálózat" – mindig a friss fájlt próbálja letölteni
//  (így fejlesztés közben is azonnal látod a változásokat), és csak ha nincs internet,
//  akkor adja vissza az elmentett (cache-elt) változatot.
// =====================================================

const CACHE = "foodshare-v4"; // ha új fájl kerül a listába, növeld a számot

const APP_FILES = [
  "./", "index.html", "style.css", "logo.svg", "manifest.json",
  "translations.js", "data.js", "theme.js", "pwa.js", "location.js", "photo.js",
  "profile.js", "notify.js", "rating.js", "qrscan.js", "script.js",
  "cegeknek.html", "business.css", "business.js", "business-translations.js", "templates.js",
  "pricing.js", "diet.js", "demo.js", "cloud.js", "firebase-config.js",
  "icon-192.png", "icon-512.png", "admin-logo.svg", "admin-icon-180.png",
];

// Telepítéskor elmentjük az alap fájlokat
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

// Régi cache-ek törlése, ha új verzió jön
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // A térkép csempéit nem mentjük (túl sok lenne)
  if (request.url.includes("tile.openstreetmap.org")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
