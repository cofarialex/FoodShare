// =====================================================
//  Telepíthető app (PWA = Progressive Web App)
//  - manifest.json: az app neve, ikonja, színe
//  - sw.js (service worker): a háttérben fut, elmenti a fájlokat, így internet nélkül is megnyílik
//  FONTOS: csak http(s)-en működik (Live Server: igen, dupla kattintás / file://: nem).
// =====================================================

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Chrome/Edge: ha telepíthető, megjelenítjük a saját "Telepítés" gombunkat
let installPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();        // ne a böngésző saját sávja jelenjen meg
  installPrompt = event;
  document.getElementById("installButton").classList.remove("hidden");
});

async function installApp() {
  if (!installPrompt) return;
  installPrompt.prompt();        // a böngésző telepítő ablaka
  await installPrompt.userChoice;
  installPrompt = null;
  document.getElementById("installButton").classList.add("hidden");
}

window.addEventListener("appinstalled", () => {
  document.getElementById("installButton").classList.add("hidden");
});
