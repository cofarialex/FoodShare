// =====================================================
//  Hűtőszenzor-szimuláció (admin)
//  Úgy teszünk, mintha minden automatában lenne egy hőmérő, ami 3 másodpercenként mér.
//  - normál esetben a hőmérséklet az alapérték körül ingadozik
//  - "Hiba szimulálása": a hűtés leáll, a hőmérséklet emelkedik
//  - 8 °C fölött az automata AUTOMATIKUSAN zárolódik (ezt a data.js isLockerBroken() függvénye intézi)
//  A mért értéket elmentjük, így a főoldal is azonnal látja.
// =====================================================

const SENSOR_INTERVAL = 3000;   // ms
const HISTORY_LENGTH = 40;      // ennyi mérést mutat a grafikon
const sensorHistory = {};       // { A1: [4.1, 4.0, ...], ... }
const sensorLog = [];           // riasztások listája
let sensorTimer = null;

function baseTempOf(l) {
  if (l.baseTemp === undefined) l.baseTemp = l.temp; // az első induláskor a mostani érték lesz az alap
  return l.baseTemp;
}

function addSensorLog(icon, text, level) {
  sensorLog.unshift({ time: now(), icon, text, level });
  if (sensorLog.length > 30) sensorLog.pop();
}

// Egy mérés minden automatán
function sensorTick() {
  lockers.forEach((l) => {
    const before = l.temp;
    const base = baseTempOf(l);
    let temp = l.temp;

    if (l.fault) {
      temp += 0.35 + Math.random() * 0.25;          // hiba: melegszik
    } else if (temp > base + 0.3) {
      temp -= 0.4 + Math.random() * 0.2;            // javítás után visszahűl
    } else {
      temp += (Math.random() - 0.5) * 0.3;          // normál ingadozás
      temp += (base - temp) * 0.2;                  // húzás az alapérték felé
    }
    l.temp = Math.round(temp * 10) / 10;

    // Átlépte a 8 °C-ot? -> riasztás
    if (before <= MAX_SAFE_TEMP && l.temp > MAX_SAFE_TEMP) {
      const affected = affectedFood(l).length;
      addSensorLog("🚨", `${l.name}: ${l.temp} °C – automatikusan zárolva. ${affected} étel érintett.`, "bad");
    }
    if (before > MAX_SAFE_TEMP && l.temp <= MAX_SAFE_TEMP) {
      addSensorLog("✅", `${l.name}: visszahűlt (${l.temp} °C), újra üzemel.`, "good");
    }

    sensorHistory[l.id] = sensorHistory[l.id] || [];
    sensorHistory[l.id].push(l.temp);
    if (sensorHistory[l.id].length > HISTORY_LENGTH) sensorHistory[l.id].shift();
  });
  saveLockers();
  renderSensors();
}

// A túlmelegedett automatában lévő ételek (élelmiszer-biztonsági okból ellenőrizni / kiüríteni kell)
function affectedFood(l) {
  return donations.filter((d) => d.lockerId === l.id && (d.status === "available" || d.status === "reserved"));
}

function startSensors() {
  if (sensorTimer) return;
  sensorTimer = setInterval(sensorTick, SENSOR_INTERVAL);
  sensorTick();
}

function stopSensors() {
  clearInterval(sensorTimer);
  sensorTimer = null;
  renderSensors();
}

function toggleSensors() {
  if (sensorTimer) stopSensors();
  else startSensors();
}

function simulateFault(id) {
  const l = getLocker(id);
  l.fault = true;
  addSensorLog("🔥", `${l.name}: hűtési hiba szimulálva.`, "bad");
  saveLockers();
  startSensors();
}

function repairLocker(id) {
  const l = getLocker(id);
  l.fault = false;
  if (baseTempOf(l) > MAX_SAFE_TEMP - 2) l.baseTemp = 4.0; // ha eleve meleg volt (pl. D4), a javítás után 4 °C a cél
  addSensorLog("🔧", `${l.name}: javítás elindítva, hűtés folyamatban.`, "good");
  saveLockers();
  startSensors();
}

function clearAffected(id) {
  const l = getLocker(id);
  const list = affectedFood(l);
  if (!confirm(`${list.length} ételt kiürítesz a(z) ${l.name} automatából élelmiszer-biztonsági okból. Folytatod?`)) return;
  list.forEach((d) => { d.status = "cleared"; d.pickupCode = null; });
  saveDonations();
  addSensorLog("🧹", `${l.name}: ${list.length} érintett étel kiürítve.`, "good");
  renderAdmin();
}

// Kis vonaldiagram SVG-ben (0–14 °C skála, piros szaggatott vonal 8 °C-nál)
function sparkline(values) {
  const w = 260, h = 70, max = 14, min = 0;
  const y = (v) => h - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * h;
  const step = values.length > 1 ? w / (HISTORY_LENGTH - 1) : 0;
  const offset = w - step * (values.length - 1);
  const points = values.map((v, i) => `${(offset + i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  const color = last > MAX_SAFE_TEMP ? "#e74c3c" : "#27ae60";
  return `<svg viewBox="0 0 ${w} ${h}" class="sparkline" preserveAspectRatio="none">
    <line x1="0" x2="${w}" y1="${y(MAX_SAFE_TEMP)}" y2="${y(MAX_SAFE_TEMP)}" stroke="#e74c3c" stroke-dasharray="4 4" stroke-width="1"/>
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`;
}

function renderSensors() {
  const box = document.getElementById("sensorCards");
  if (!box) return;
  const btn = document.getElementById("sensorToggle");
  btn.textContent = sensorTimer ? "⏸️ Szimuláció leállítása" : "▶️ Szimuláció indítása";
  btn.className = "btn btn-small " + (sensorTimer ? "btn-secondary" : "btn-primary");
  document.getElementById("sensorStatus").textContent = sensorTimer
    ? `● Élő mérés, ${SENSOR_INTERVAL / 1000} másodpercenként`
    : "○ A szimuláció áll";

  box.innerHTML = lockers.map((l) => {
    const hot = l.temp > MAX_SAFE_TEMP;
    const affected = hot ? affectedFood(l).length : 0;
    return `
      <div class="sensor-card ${hot ? "hot" : ""}">
        <div class="sensor-top">
          <b>${escapeHtml(l.name)}</b> <small class="muted">${l.id}</small>
          <span class="sensor-temp">${l.temp.toLocaleString("hu-HU")} °C</span>
        </div>
        ${sparkline(sensorHistory[l.id] || [l.temp])}
        <div class="sensor-state">
          ${hot ? "🚨 Túl meleg – zárolva" : l.maintenance ? "🛠️ Karbantartás alatt" : "✅ Rendben"}
          ${l.fault ? " · 🔥 hűtési hiba" : ""}
        </div>
        ${affected ? `<div class="sensor-affected">⚠️ ${affected} étel van bent – ellenőrizni kell!
          <button class="btn btn-danger btn-small" onclick="clearAffected('${l.id}')">Kiürítés</button></div>` : ""}
        <div class="sensor-buttons">
          ${l.fault
            ? `<button class="btn btn-primary btn-small" onclick="repairLocker('${l.id}')">🔧 Javítás</button>`
            : hot
            ? `<button class="btn btn-primary btn-small" onclick="repairLocker('${l.id}')">🔧 Hűtés javítása</button>`
            : `<button class="btn btn-secondary btn-small" onclick="simulateFault('${l.id}')">🔥 Hiba szimulálása</button>`}
        </div>
      </div>`;
  }).join("");

  document.getElementById("sensorLog").innerHTML = sensorLog.length
    ? sensorLog.map((e) => `<li class="${e.level}">${e.icon} <small>${new Date(e.time).toLocaleTimeString("hu-HU")}</small> ${escapeHtml(e.text)}</li>`).join("")
    : `<li class="muted">Még nincs esemény. Próbáld ki a „🔥 Hiba szimulálása” gombot!</li>`;

  // Piros jelzés a fülön, ha valamelyik automata túl meleg
  const hotCount = lockers.filter((l) => l.temp > MAX_SAFE_TEMP).length;
  const badge = document.getElementById("hotLockers");
  badge.textContent = hotCount;
  badge.classList.toggle("hidden", hotCount === 0);
}

document.getElementById("sensorToggle").addEventListener("click", toggleSensors);
