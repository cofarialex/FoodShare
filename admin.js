// =====================================================
//  FoodShare – Admin felület
//  Belépés jelszóval (első megnyitáskor te állítod be).
//  FIGYELEM: szerver nélkül ez csak bemutató szintű védelem,
//  mert minden a böngészőben fut és tárolódik.
// =====================================================

const AUTH_KEY = "foodshare_admin_auth";     // { salt, hash } – a jelszó NEM, csak a "lenyomata" van tárolva
const SESSION_KEY = "foodshare_admin_session"; // amíg a fül nyitva van, bent maradsz
const MAX_TRIES = 5;                           // ennyi rossz próbálkozás után várni kell
const LOCK_SECONDS = 30;

// ---------- Jelszó "hash"-elés ----------
// A hash egy egyirányú lenyomat: a jelszóból könnyű kiszámolni, de visszafelé nem lehet.
// Így a tárolóban nem a jelszó van, csak a lenyomata.

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + password);
  if (window.crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Tartalék, ha a böngésző nem engedi a crypto.subtle-t (egyszerűbb hash)
  let h = 0;
  for (const byte of data) h = (h * 31 + byte) >>> 0;
  return "simple-" + h.toString(16);
}

function randomSalt() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getAuth() {
  const saved = localStorage.getItem(AUTH_KEY);
  return saved ? JSON.parse(saved) : null;
}

async function setPassword(password) {
  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  localStorage.setItem(AUTH_KEY, JSON.stringify({ salt, hash }));
}

async function checkPassword(password) {
  const auth = getAuth();
  return auth && (await hashPassword(password, auth.salt)) === auth.hash;
}

// ---------- Belépés ----------

let failedTries = 0;
let lockedUntil = 0;

function showLogin() {
  // Felhő mód: a Firebase-ben létrehozott admin e-maillel és jelszóval lehet belépni
  if (CLOUD.enabled) {
    document.getElementById("loginTitle").textContent = "Admin belépés";
    document.getElementById("loginText").textContent = "Lépj be a Firebase-ben létrehozott admin e-mail-címeddel és jelszavaddal.";
    document.getElementById("adminEmail").classList.remove("hidden");
    document.getElementById("adminEmail").required = true;
    document.getElementById("password2").classList.add("hidden");
    document.getElementById("password2").required = false;
    document.getElementById("loginButton").textContent = "Belépés";
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("adminApp").classList.add("hidden");
    return;
  }
  const firstTime = !getAuth();
  document.getElementById("loginTitle").textContent = firstTime ? "Admin jelszó beállítása" : "Admin belépés";
  document.getElementById("loginText").textContent = firstTime
    ? "Ez az első belépés. Adj meg egy legalább 6 karakteres jelszót – ezzel tudsz majd belépni."
    : "Csak az adminisztrátor férhet hozzá.";
  document.getElementById("password2").classList.toggle("hidden", !firstTime);
  document.getElementById("password2").required = firstTime;
  document.getElementById("loginButton").textContent = firstTime ? "Jelszó mentése és belépés" : "Belépés";
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("adminApp").classList.add("hidden");
  document.getElementById("password").focus();
}

function showAdmin() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("adminApp").classList.remove("hidden");
  renderAdmin();
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("loginError");
  const password = document.getElementById("password").value;

  // Felhő mód: Firebase bejelentkezés
  if (CLOUD.enabled) {
    try {
      await cloudAdminSignIn(document.getElementById("adminEmail").value.trim(), password);
      error.textContent = "";
      event.target.reset();
      // a többit az initCloud onAdminChange intézi (megnyitja az admin felületet)
    } catch (e) {
      error.textContent = "Hibás e-mail vagy jelszó.";
    }
    return;
  }

  // Első belépés: jelszó beállítása
  if (!getAuth()) {
    const password2 = document.getElementById("password2").value;
    if (password.length < 6) { error.textContent = "A jelszó legalább 6 karakter legyen."; return; }
    if (password !== password2) { error.textContent = "A két jelszó nem egyezik."; return; }
    await setPassword(password);
    sessionStorage.setItem(SESSION_KEY, "1");
    event.target.reset();
    showAdmin();
    return;
  }

  // Túl sok rossz próbálkozás után várni kell
  if (now() < lockedUntil) {
    error.textContent = `Túl sok próbálkozás. Várj ${Math.ceil((lockedUntil - now()) / 1000)} másodpercet.`;
    return;
  }

  if (await checkPassword(password)) {
    failedTries = 0;
    error.textContent = "";
    sessionStorage.setItem(SESSION_KEY, "1");
    event.target.reset();
    showAdmin();
  } else {
    failedTries++;
    if (failedTries >= MAX_TRIES) {
      lockedUntil = now() + LOCK_SECONDS * 1000;
      failedTries = 0;
      error.textContent = `Túl sok rossz próbálkozás. Várj ${LOCK_SECONDS} másodpercet.`;
    } else {
      error.textContent = `Hibás jelszó. (${MAX_TRIES - failedTries} próbálkozás maradt)`;
    }
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  sessionStorage.removeItem(SESSION_KEY);
  if (CLOUD.enabled) await cloudSignOut();
  showLogin();
});

// ---------- Fülek ----------

document.querySelectorAll(".admin-tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tabs button").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.add("hidden"));
    document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");
    if (btn.dataset.tab === "sensors") startSensors(); // a fül megnyitásakor elindul a mérés
    if (btn.dataset.tab === "lockers") {
      initLockerMap();
      initAdminMap();
    }
  });
});

// ---------- Segédfüggvények ----------

const hu = TRANSLATIONS.hu;

function titleOf(d) {
  return typeof d.title === "object" ? d.title.hu : d.title;
}

function lockerLabel(id) {
  const l = getLocker(id);
  return l ? l.name : `${id} (törölt automata)`;
}

function formatDate(ms) {
  if (!ms) return "–";
  return new Date(ms).toLocaleString("hu-HU", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function percent(part, total) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function sumPortions(list) {
  return list.reduce((sum, d) => sum + d.portions, 0);
}

function isWasted(d) {
  return d.status === "expired" || d.status === "cleared";
}

// ---------- Mindent újrarajzol ----------

function renderAdmin() {
  checkTimers();
  renderStats();
  renderLockerTable();
  renderDonationTable();
  renderFeedback();
  renderLeads();
  if (typeof renderReport === "function") renderReport();
  if (typeof renderSensors === "function") renderSensors();
  updateAdminMarkers();
  updateLockerMapMarkers();
}

// ---------- STATISZTIKÁK ----------

function renderStats() {
  const real = donations.filter((d) => d.status !== "waiting"); // ami ténylegesen bekerült
  const saved = sumPortions(donations.filter((d) => d.status === "collected"));
  const wasted = sumPortions(donations.filter(isWasted));
  const rate = percent(saved, saved + wasted);
  const working = lockers.filter((l) => !isLockerBroken(l));
  const freeTotal = working.reduce((s, l) => s + freeSlots(l).length, 0);
  const sizeTotal = working.reduce((s, l) => s + l.size, 0);

  const kpis = [
    { label: "Összes adomány", value: real.length },
    { label: "Megmentett adag", value: saved, cls: "good" },
    { label: "Kidobott adag (lejárt)", value: wasted, cls: wasted > 0 ? "bad" : "" },
    { label: "Mentési arány", value: rate + "%", cls: rate >= 70 ? "good" : "bad" },
    { label: "Most elérhető", value: donations.filter((d) => d.status === "available").length },
    { label: "Aktív foglalás", value: donations.filter((d) => d.status === "reserved").length },
    { label: "Szabad rekesz", value: `${freeTotal}/${sizeTotal}` },
    { label: "Zárolt automata", value: lockers.length - working.length, cls: lockers.length - working.length > 0 ? "bad" : "" },
    { label: "Átlagos értékelés", value: averageRating() },
    { label: "Eladások bevétele", value: salesRevenue().toLocaleString("hu-HU", { maximumFractionDigits: 2 }) + " lei", cls: "good" },
    { label: "FoodShare jutalék (15%)", value: (salesRevenue() * 0.15).toLocaleString("hu-HU", { maximumFractionDigits: 2 }) + " lei", cls: "good" },
  ];
  document.getElementById("kpis").innerHTML = kpis
    .map((k) => `<div class="kpi ${k.cls || ""}"><span>${k.label}</span><strong>${k.value}</strong></div>`)
    .join("");

  // Kategóriánként: megmentett vs. kidobott adag
  const catRows = Object.keys(CATEGORIES).map((id) => {
    const list = donations.filter((d) => d.category === id && d.status !== "waiting");
    const s = sumPortions(list.filter((d) => d.status === "collected"));
    const w = sumPortions(list.filter(isWasted));
    const total = sumPortions(list);
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${CATEGORIES[id].icon} ${hu["cat_" + id]} <small class="muted">(${list.length} adomány)</small></span>
          <span>${s} mentve · ${w} lejárt</span></div>
        <div class="bar">
          <div class="bar-saved" style="width:${percent(s, total)}%"></div>
          <div class="bar-wasted" style="width:${percent(w, total)}%"></div>
        </div>
      </div>`;
  }).join("");
  document.getElementById("categoryStats").innerHTML = catRows + `
    <div class="bar-legend"><span><i class="bar-saved"></i>átvéve</span><span><i class="bar-wasted"></i>lejárt</span><span><i style="background:#e8eeea"></i>még bent / foglalva</span></div>`;

  // Automaták kihasználtsága
  document.getElementById("lockerStats").innerHTML = lockers.map((l) => {
    const used = l.size - freeSlots(l).length;
    const status = l.maintenance ? " 🛠️" : l.temp > MAX_SAFE_TEMP ? " 🌡️⚠️" : "";
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${escapeHtml(l.name)}${status}</span><span>${used}/${l.size} rekesz</span></div>
        <div class="bar"><div class="bar-used" style="width:${percent(used, l.size)}%"></div></div>
      </div>`;
  }).join("");

  // Top 5 adományozó
  const donors = {};
  real.forEach((d) => {
    donors[d.donor] = donors[d.donor] || { count: 0, portions: 0 };
    donors[d.donor].count++;
    donors[d.donor].portions += d.portions;
  });
  const top = Object.entries(donors).sort((a, b) => b[1].portions - a[1].portions).slice(0, 5);
  document.getElementById("donorStats").innerHTML = top.length === 0
    ? "<p class='muted'>Még nincs adat.</p>"
    : `<table class="admin-table"><tr><th>#</th><th>Adományozó</th><th>Adomány</th><th>Adag</th></tr>
       ${top.map(([name, v], i) => `<tr><td>${i + 1}.</td><td>${escapeHtml(name)}</td><td>${v.count}</td><td>${v.portions}</td></tr>`).join("")}
       </table>`;
}

// ---------- AUTOMATÁK ----------

function renderLockerTable() {
  document.getElementById("lockerTable").innerHTML = lockers.map((l) => {
    const used = l.size - freeSlots(l).length;
    const hot = l.temp > MAX_SAFE_TEMP;
    return `
      <tr>
        <td><b>${l.id}</b></td>
        <td><input type="text" id="name-${l.id}" value="${escapeHtml(l.name)}"></td>
        <td><input type="text" id="addr-${l.id}" value="${escapeHtml(l.address)}"></td>
        <td><input type="number" step="0.0001" id="lat-${l.id}" value="${l.lat}"></td>
        <td><input type="number" step="0.0001" id="lon-${l.id}" value="${l.lon}"></td>
        <td><input type="number" step="0.1" id="temp-${l.id}" value="${l.temp}" class="${hot ? "temp-bad" : ""}"></td>
        <td><input type="checkbox" id="maint-${l.id}" ${l.maintenance ? "checked" : ""}></td>
        <td><input type="number" min="1" max="24" id="size-${l.id}" value="${l.size}"></td>
        <td>${used}/${l.size}</td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-small ${relocating === l.id ? "active-pin" : ""}" title="Áthelyezés a térképen" onclick="startRelocate('${l.id}')">📍</button>
          <button class="btn btn-primary btn-small" onclick="saveLocker('${l.id}')">Mentés</button>
          <button class="btn btn-danger btn-small" onclick="deleteLocker('${l.id}')">Törlés</button>
        </td>
      </tr>`;
  }).join("");
}

function saveLocker(id) {
  const l = getLocker(id);
  const newSize = Number(document.getElementById("size-" + id).value);

  // A rekeszszámot nem lehet úgy csökkenteni, hogy egy foglalt rekesz "kiessen"
  const highestUsed = Math.max(0, ...donations.filter((d) => d.lockerId === id && occupiesSlot(d)).map((d) => d.slot));
  if (newSize < highestUsed) {
    alert(`Nem csökkentheted ${newSize}-ra: a(z) ${highestUsed}. rekeszben még van valami.`);
    return;
  }

  const newName = document.getElementById("name-" + id).value.trim();
  if (newName !== l.name) l.customName = true; // a főoldalon is ez a név látszódjon, minden nyelven
  l.name = newName;
  l.address = document.getElementById("addr-" + id).value.trim();
  l.temp = Number(document.getElementById("temp-" + id).value);
  l.maintenance = document.getElementById("maint-" + id).checked;
  l.size = newSize;
  const lat = Number(document.getElementById("lat-" + id).value);
  const lon = Number(document.getElementById("lon-" + id).value);
  if (lat && lon) { l.lat = lat; l.lon = lon; }
  saveLockers();
  renderAdmin();
}

function deleteLocker(id) {
  const busy = donations.some((d) => d.lockerId === id && occupiesSlot(d));
  if (busy) {
    alert("Ebben az automatában még van étel vagy foglalás. Előbb ürítsd ki!");
    return;
  }
  if (!confirm(`Biztosan törlöd a(z) ${getLocker(id).name} automatát?`)) return;
  lockers = lockers.filter((l) => l.id !== id);
  saveLockers();
  renderAdmin();
}

// Új automata egyedi azonosítója: következő betű + sorszám (pl. E5)
function nextLockerId() {
  let n = lockers.length;
  let id;
  do {
    id = String.fromCharCode(65 + (n % 26)) + (n + 1);
    n++;
  } while (getLocker(id));
  return id;
}

document.getElementById("newLockerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const locker = {
    id: nextLockerId(),
    name: document.getElementById("nlName").value.trim(),
    address: document.getElementById("nlAddress").value.trim(),
    lat: Number(document.getElementById("nlLat").value),
    lon: Number(document.getElementById("nlLon").value),
    size: Number(document.getElementById("nlSize").value),
    temp: Number(document.getElementById("nlTemp").value),
    maintenance: false,
    customName: true,
  };
  lockers.push(locker);
  saveLockers();
  event.target.reset();
  if (pickMarker) { adminMap.removeLayer(pickMarker); pickMarker = null; }
  const msg = document.getElementById("nlMessage");
  msg.textContent = `✅ ${locker.name} (${locker.id}) hozzáadva!`;
  setTimeout(() => (msg.textContent = ""), 4000);
  renderAdmin();
});

// Kis térkép: kattintással koordináta választás
let adminMap = null;
let pickMarker = null;
let adminMarkers = [];

function initAdminMap() {
  if (adminMap) {
    adminMap.invalidateSize(); // a rejtett fül miatt újra kell méreteznie magát
    return;
  }
  adminMap = L.map("adminMap").setView(MAP_CENTER, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(adminMap);
  adminMap.on("click", (e) => {
    document.getElementById("nlLat").value = e.latlng.lat.toFixed(4);
    document.getElementById("nlLon").value = e.latlng.lng.toFixed(4);
    if (pickMarker) adminMap.removeLayer(pickMarker);
    pickMarker = L.circleMarker(e.latlng, { radius: 9, color: "#27ae60", fillOpacity: 0.7 }).addTo(adminMap);
  });
  updateAdminMarkers();
}

function updateAdminMarkers() {
  if (!adminMap) return;
  adminMarkers.forEach((m) => adminMap.removeLayer(m));
  adminMarkers = lockers.map((l) => L.marker([l.lat, l.lon]).addTo(adminMap).bindPopup(`<b>${escapeHtml(l.name)}</b> (${l.id})`));
}

// ---------- AUTOMATÁK ÁTHELYEZÉSE A TÉRKÉPEN ----------

let lockerMap = null;
let lockerMapMarkers = [];
let relocating = null; // annak az automatának az ID-ja, amit épp áthelyezünk (📍 gomb után)

function initLockerMap() {
  if (lockerMap) {
    lockerMap.invalidateSize();
    return;
  }
  lockerMap = L.map("lockerMap").setView(MAP_CENTER, 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(lockerMap);
  // Kattintás: ha a 📍 gombbal kiválasztottál egy automatát, ide kerül
  lockerMap.on("click", (e) => {
    if (!relocating) return;
    moveLocker(relocating, e.latlng.lat, e.latlng.lng);
    relocating = null;
  });
  updateLockerMapMarkers();
}

function updateLockerMapMarkers() {
  if (!lockerMap) return;
  lockerMapMarkers.forEach((m) => lockerMap.removeLayer(m));
  lockerMapMarkers = lockers.map((l) => {
    // draggable: true -> a jelölőt egérrel át lehet húzni
    const marker = L.marker([l.lat, l.lon], { draggable: true, title: l.name })
      .addTo(lockerMap)
      .bindTooltip(`${escapeHtml(l.name)} (${l.id})`, { permanent: true, direction: "top", offset: [-15, -12] });
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      moveLocker(l.id, pos.lat, pos.lng);
    });
    return marker;
  });
}

function startRelocate(id) {
  relocating = id;
  initLockerMap();
  const l = getLocker(id);
  lockerMap.setView([l.lat, l.lon], 16);
  document.getElementById("relocateHint").innerHTML = `📍 Most kattints a térképre oda, ahová a(z) <b>${escapeHtml(l.name)}</b> automatát szeretnéd tenni.`;
  document.getElementById("lockerMap").scrollIntoView({ behavior: "smooth", block: "center" });
  renderLockerTable();
}

function moveLocker(id, lat, lon) {
  const l = getLocker(id);
  l.lat = Number(lat.toFixed(5));   // 5 tizedesjegy ≈ 1 méteres pontosság
  l.lon = Number(lon.toFixed(5));
  saveLockers();
  document.getElementById("relocateHint").innerHTML = `✅ <b>${escapeHtml(l.name)}</b> áthelyezve (${l.lat}, ${l.lon}). A főoldalon azonnal frissül.`;
  renderAdmin();
}

// ---------- ADOMÁNYOK ----------

const STATUSES = ["waiting", "available", "reserved", "collected", "expired", "cleared"];

function fillDonationFilters() {
  const statusFilter = document.getElementById("statusFilter");
  const lockerFilter = document.getElementById("adminLockerFilter");
  const keepStatus = statusFilter.value;
  const keepLocker = lockerFilter.value;
  statusFilter.innerHTML = `<option value="all">Minden állapot</option>` +
    STATUSES.map((s) => `<option value="${s}">${hu["st_" + s]}</option>`).join("");
  lockerFilter.innerHTML = `<option value="all">Minden automata</option>` +
    lockers.map((l) => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join("");
  if (keepStatus) statusFilter.value = keepStatus;
  if (keepLocker && getLocker(keepLocker)) lockerFilter.value = keepLocker;
}

function renderDonationTable() {
  fillDonationFilters();
  const status = document.getElementById("statusFilter").value;
  const lockerId = document.getElementById("adminLockerFilter").value;

  const list = donations
    .filter((d) => (status === "all" || d.status === status) && (lockerId === "all" || d.lockerId === lockerId))
    .sort((a, b) => (b.createdAt || b.id) - (a.createdAt || a.id)); // legújabb elöl

  document.getElementById("donationTable").innerHTML = list.length === 0
    ? `<tr><td colspan="9" class="muted">Nincs találat.</td></tr>`
    : list.map((d) => `
      <tr>
        <td>${formatDate(d.createdAt || d.id)}</td>
        <td>${d.photo ? `<img src="${d.photo}" class="thumb" alt="">` : ""}<b>${escapeHtml(titleOf(d))}</b></td>
        <td>${CATEGORIES[d.category].icon} ${hu["cat_" + d.category]}</td>
        <td>${escapeHtml(lockerLabel(d.lockerId))} / ${d.slot}.</td>
        <td>${d.portions}</td>
        <td>${escapeHtml(d.donor)}</td>
        <td><span class="pill pill-${d.status}">${hu["st_" + d.status]}</span></td>
        <td>${formatDate(d.expiresAt)}</td>
        <td class="actions-cell">
          ${d.status === "expired" ? `<button class="btn btn-secondary btn-small" onclick="adminClear(${d.id})">Kiürítés</button>` : ""}
          <button class="btn btn-danger btn-small" onclick="adminDelete(${d.id})">Törlés</button>
        </td>
      </tr>`).join("");
}

function adminClear(id) {
  donations.find((d) => d.id === id).status = "cleared";
  saveDonations();
  renderAdmin();
}

function adminDelete(id) {
  if (!confirm("Biztosan törlöd ezt az adományt? (A statisztikából is eltűnik.)")) return;
  donations = donations.filter((d) => d.id !== id);
  saveDonations();
  renderAdmin();
}

document.getElementById("statusFilter").addEventListener("change", renderDonationTable);
document.getElementById("adminLockerFilter").addEventListener("change", renderDonationTable);
document.getElementById("clearAllExpired").addEventListener("click", () => {
  const expired = donations.filter((d) => d.status === "expired");
  if (expired.length === 0) { alert("Nincs lejárt étel."); return; }
  expired.forEach((d) => (d.status = "cleared"));
  saveDonations();
  renderAdmin();
});

// ---------- VISSZAJELZÉSEK ----------

const PROBLEM_LABELS = {
  spoiled: "Romlott / furcsa szagú",
  wrong: "Nem az volt bent",
  missing: "Üres rekesz",
  dirty: "Piszkos / meleg rekesz",
  other: "Egyéb",
};

// A kifizetett (szimulált) eladások összege
function salesRevenue() {
  return donations.filter((d) => d.paid && d.price > 0).reduce((sum, d) => sum + d.price, 0);
}

function averageRating() {
  const rated = donations.filter((d) => d.rating);
  if (rated.length === 0) return "–";
  const avg = rated.reduce((s, d) => s + d.rating.stars, 0) / rated.length;
  return "⭐ " + avg.toLocaleString("hu-HU", { maximumFractionDigits: 1 });
}

function renderFeedback() {
  const rated = donations.filter((d) => d.rating);
  const problems = rated.filter((d) => d.rating.problems.length > 0);
  const open = problems.filter((d) => !d.rating.resolved);

  // Piros szám a fülön, ha van megoldatlan probléma
  const badge = document.getElementById("openReports");
  badge.textContent = open.length;
  badge.classList.toggle("hidden", open.length === 0);

  document.getElementById("feedbackKpis").innerHTML = [
    { label: "Átlagos értékelés", value: averageRating() },
    { label: "Értékelések száma", value: rated.length },
    { label: "Hibabejelentés", value: problems.length },
    { label: "Megoldatlan", value: open.length, cls: open.length ? "bad" : "good" },
  ].map((k) => `<div class="kpi ${k.cls || ""}"><span>${k.label}</span><strong>${k.value}</strong></div>`).join("");

  const filter = document.getElementById("feedbackFilter").value;
  const list = (filter === "open" ? open : filter === "problems" ? problems : rated)
    .sort((a, b) => b.rating.at - a.rating.at);

  document.getElementById("feedbackTable").innerHTML = list.length === 0
    ? `<tr><td colspan="8" class="muted">${filter === "open" ? "🎉 Nincs megoldatlan probléma." : "Nincs találat."}</td></tr>`
    : list.map((d) => {
        const r = d.rating;
        const isOpen = r.problems.length > 0 && !r.resolved;
        const locker = getLocker(d.lockerId);
        return `
        <tr class="${isOpen ? "report-open" : ""}">
          <td>${formatDate(r.at)}</td>
          <td><b>${escapeHtml(titleOf(d))}</b></td>
          <td>${escapeHtml(d.donor)}</td>
          <td>${escapeHtml(lockerLabel(d.lockerId))} / ${d.slot}.</td>
          <td class="stars-cell">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</td>
          <td>${r.problems.map((p) => `<span class="problem-tag">${PROBLEM_LABELS[p]}</span>`).join(" ") || "–"}</td>
          <td>${escapeHtml(r.comment) || "–"}</td>
          <td class="actions-cell">
            ${isOpen ? `<button class="btn btn-primary btn-small" onclick="resolveReport(${d.id})">Megoldva</button>` : ""}
            ${isOpen && r.problems.includes("dirty") && locker && !locker.maintenance
              ? `<button class="btn btn-secondary btn-small" onclick="lockerToMaintenance('${locker.id}')">Automata karbantartásra</button>` : ""}
          </td>
        </tr>`;
      }).join("");
}

function resolveReport(id) {
  donations.find((d) => d.id === id).rating.resolved = true;
  saveDonations();
  renderAdmin();
}

function lockerToMaintenance(lockerId) {
  getLocker(lockerId).maintenance = true;
  saveLockers();
  renderAdmin();
}

document.getElementById("feedbackFilter").addEventListener("change", renderFeedback);

// ---------- ÉRDEKLŐDŐ CÉGEK ----------

const LEADS_KEY = "foodshare_leads";
const LEAD_STATUSES = { new: "🆕 Új", contacted: "📞 Felvettük a kapcsolatot", customer: "✅ Ügyfél", lost: "❌ Nem érdekli" };
const LEAD_PLANS = { unsure: "Még nem tudja", basic: "Alap", pro: "Pro", chain: "Lánc / Partner" };

function loadLeads() {
  if (CLOUD.enabled) return CLOUD.leads; // felhő mód: a Firebase-ből jön
  return JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");
}

function saveLeads(leads) {
  if (CLOUD.enabled) {
    CLOUD.leads = leads;
    pushDiff("leads", leads);
    return;
  }
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function renderLeads() {
  const leads = loadLeads();
  const fresh = leads.filter((l) => l.status === "new").length;

  const badge = document.getElementById("newLeads");
  badge.textContent = fresh;
  badge.classList.toggle("hidden", fresh === 0);

  const customers = leads.filter((l) => l.status === "customer");
  // Tervezett bevétel: Pro ügyfelek x 149 lej (csak tájékoztató)
  const mrr = customers.filter((l) => l.plan === "pro").length * 149;
  document.getElementById("leadKpis").innerHTML = [
    { label: "Összes érdeklődő", value: leads.length },
    { label: "Új", value: fresh, cls: fresh ? "bad" : "" },
    { label: "Ügyfél", value: customers.length, cls: "good" },
    { label: "Havi bevétel (Pro)", value: mrr + " lei", cls: "good" },
  ].map((k) => `<div class="kpi ${k.cls || ""}"><span>${k.label}</span><strong>${k.value}</strong></div>`).join("");

  document.getElementById("leadTable").innerHTML = leads.length === 0
    ? `<tr><td colspan="10" class="muted">Még nincs érdeklődő. A cegeknek.html űrlapján lehet jelentkezni.</td></tr>`
    : leads.map((l) => `
      <tr class="${l.status === "new" ? "report-open" : ""}">
        <td>${formatDate(l.createdAt)}</td>
        <td><b>${escapeHtml(l.company)}</b></td>
        <td>${escapeHtml((TRANSLATIONS.hu["bType_" + l.type]) || l.type)}</td>
        <td>${escapeHtml(l.city)}</td>
        <td>${LEAD_PLANS[l.plan] || l.plan}</td>
        <td>${escapeHtml(l.name)}<br><a href="mailto:${escapeHtml(l.email)}">${escapeHtml(l.email)}</a>${l.phone ? "<br>" + escapeHtml(l.phone) : ""}</td>
        <td>${l.checkScore}/6</td>
        <td>${escapeHtml(l.message) || "–"}</td>
        <td>
          <select onchange="setLeadStatus(${l.id}, this.value)">
            ${Object.entries(LEAD_STATUSES).map(([k, v]) => `<option value="${k}" ${l.status === k ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </td>
        <td><button class="btn btn-danger btn-small" onclick="deleteLead(${l.id})">Törlés</button></td>
      </tr>`).join("");
}

function setLeadStatus(id, status) {
  const leads = loadLeads();
  leads.find((l) => l.id === id).status = status;
  saveLeads(leads);
  renderLeads();
}

function deleteLead(id) {
  if (!confirm("Biztosan törlöd ezt az érdeklődőt?")) return;
  saveLeads(loadLeads().filter((l) => l.id !== id));
  renderLeads();
}

// ---------- ÁTADÁSI NAPLÓ EXPORT (nyomon követhetőség) ----------
// CSV = egyszerű táblázat szövegként, Excel is megnyitja.
// Pontosvesszőt használunk, mert a magyar/román Excel azt várja; az elején lévő \uFEFF miatt jók lesznek az ékezetek.

function csvCell(value) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportTransferLog() {
  const header = ["Azonosító", "Feltöltve", "Betöltve", "Átvéve", "Étel", "Kategória", "Adag", "Becsült kg",
                  "Adományozó", "Automata", "Cím", "Rekesz", "Állapot", "Típus", "Eredeti ár (lei)", "Eladási ár (lei)", "Fizetve",
                  "Diéta / allergén", "Értékelés", "Probléma"];
  const rows = [...donations]
    .sort((a, b) => (a.createdAt || a.id) - (b.createdAt || b.id))
    .map((d) => {
      const l = getLocker(d.lockerId);
      return [
        d.id, formatDate(d.createdAt || d.id), formatDate(d.loadedAt), formatDate(d.collectedAt),
        titleOf(d), hu["cat_" + d.category], d.portions, (d.portions * 0.4).toFixed(1).replace(".", ","),
        d.donor, lockerLabel(d.lockerId), l ? l.address : "", d.slot, hu["st_" + d.status],
        d.price > 0 ? "Kedvezményes eladás" : "Adomány",
        d.price > 0 ? String(d.originalPrice).replace(".", ",") : "", d.price > 0 ? String(d.price).replace(".", ",") : "",
        d.paid ? "igen" : "", (d.tags || []).map((tag) => hu["diet_" + tag]).join(", "),
        d.rating ? d.rating.stars : "", d.rating ? d.rating.problems.map((p) => PROBLEM_LABELS[p]).join(", ") : "",
      ];
    });
  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `foodshare-atadasi-naplo-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

document.getElementById("exportLog").addEventListener("click", exportTransferLog);

// ---------- BEÁLLÍTÁSOK ----------

document.getElementById("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const msg = document.getElementById("passwordMessage");
  const oldPw = document.getElementById("oldPassword").value;
  const newPw = document.getElementById("newPassword").value;
  const newPw2 = document.getElementById("newPassword2").value;

  if (!(await checkPassword(oldPw))) { msg.textContent = "❌ A jelenlegi jelszó hibás."; return; }
  if (newPw.length < 6) { msg.textContent = "❌ Az új jelszó legalább 6 karakter legyen."; return; }
  if (newPw !== newPw2) { msg.textContent = "❌ A két új jelszó nem egyezik."; return; }

  await setPassword(newPw);
  event.target.reset();
  msg.textContent = "✅ Jelszó megváltoztatva.";
});

document.getElementById("resetSample").addEventListener("click", () => {
  if (!confirm("Minden jelenlegi adomány helyére a mintaadatok kerülnek. Folytatod?")) return;
  donations = createSampleData();
  saveDonations();
  renderAdmin();
});

document.getElementById("resetLockers").addEventListener("click", () => {
  if (!confirm("Az automaták visszaállnak az eredeti 4-re (a hozzáadottak törlődnek). Folytatod?")) return;
  lockers = structuredClone(DEFAULT_LOCKERS);
  saveLockers();
  renderAdmin();
});

document.getElementById("deleteAll").addEventListener("click", () => {
  if (!confirm("Biztosan törölsz MINDEN adományt? Ez nem vonható vissza.")) return;
  donations = [];
  saveDonations();
  renderAdmin();
});

// ---------- Indulás ----------

// Ha a főoldalon (másik fülön) történik valami, az admin is frissül
onDataChangedElsewhere(() => {
  if (sessionStorage.getItem(SESSION_KEY)) renderAdmin();
});
window.addEventListener("storage", (e) => {
  if (e.key === LEADS_KEY && sessionStorage.getItem(SESSION_KEY)) renderLeads();
});

if (CLOUD.enabled) {
  showLogin();
  initCloud({
    admin: true,
    onAdminChange: (isAdmin) => {
      if (isAdmin) {
        sessionStorage.setItem(SESSION_KEY, "1");
        showAdmin();
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        showLogin();
      }
    },
  });
  // Felhő módban a jelszót a Firebase konzolban lehet módosítani
  document.getElementById("passwordForm").innerHTML =
    '<p class="muted">Felhő módban a jelszót a Firebase konzolban módosíthatod: Authentication → Users.</p>';
} else if (sessionStorage.getItem(SESSION_KEY) && getAuth()) {
  showAdmin();
} else {
  showLogin();
}

setInterval(() => {
  if (sessionStorage.getItem(SESSION_KEY)) {
    checkTimers();
    renderStats();
  }
}, 30000);
