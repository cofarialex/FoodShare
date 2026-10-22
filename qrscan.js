// =====================================================
//  QR-kód beolvasása a szimulátorban
//  1) kamerával (getUserMedia) – élőben, képkockánként keressük a QR-kódot
//  2) képből – ha nincs kamera, feltölthetsz egy képet/képernyőképet a QR-ről
//  A QR felismerését a jsQR könyvtár végzi.
//  A QR tartalma így néz ki: FOODSHARE|A1|123456  (automata | kód)
// =====================================================

let scanStream = null;   // a kamera "adatfolyama"
let scanTimer = null;

async function startScan() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setScreen(t("camUnavailable"), "error");
    return;
  }
  try {
    // facingMode: "environment" = telefonon a hátsó kamera
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  } catch (e) {
    setScreen(t("camDenied"), "error");
    return;
  }
  const video = document.getElementById("scanVideo");
  video.srcObject = scanStream;
  await video.play();
  document.getElementById("scanner").classList.remove("hidden");
  setScreen(t("scanHint"));
  scanTimer = setInterval(scanFrame, 250); // másodpercenként 4-szer nézzük meg a képet
}

function stopScan() {
  clearInterval(scanTimer);
  if (scanStream) scanStream.getTracks().forEach((track) => track.stop()); // kamera kikapcsolása
  scanStream = null;
  document.getElementById("scanner").classList.add("hidden");
}

// A videó aktuális képkockáját egy (láthatatlan) vászonra rajzoljuk, és azon keressük a QR-t
function scanFrame() {
  const video = document.getElementById("scanVideo");
  if (video.readyState < 2) return; // még nem jött kép
  const result = findQrInImage(video, video.videoWidth, video.videoHeight);
  if (result) {
    stopScan();
    handleQrText(result);
  }
}

function findQrInImage(source, width, height) {
  // Nagy képet lekicsinyítünk, így gyorsabb a keresés
  const scale = Math.min(1, 1000 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(pixels.data, canvas.width, canvas.height);
  return code ? code.data : null;
}

function handleQrText(text) {
  // Csak a mi QR-jeinket fogadjuk el
  const match = text.match(/^FOODSHARE\|([^|]+)\|(\d{6})$/);
  if (!match) {
    setScreen(t("qrNotOurs"), "error");
    return;
  }
  typedCode = match[2];
  submitCode(); // ugyanaz történik, mintha begépelted volna
}

// Képből olvasás (pl. a letöltött QR-kép vagy egy telefonos fotó)
document.getElementById("qrImageInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const result = findQrInImage(img, img.width, img.height);
    if (result) handleQrText(result);
    else setScreen(t("qrNotFound"), "error");
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
  event.target.value = ""; // így ugyanazt a képet újra is választhatod
});

// A kód ablakban: a QR letöltése képként (bemutatóhoz: ezt "olvastatod be" a szimulátorral)
function downloadQr() {
  const canvas = document.querySelector("#qrcode canvas");
  if (!canvas || !modalState) return;
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `foodshare-qr-${modalState.type}.png`;
  link.click();
}
