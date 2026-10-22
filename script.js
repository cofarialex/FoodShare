// =====================================================
//  FoodShare – hűtött ételmentő automaták (EasyBox-szerűen)
//  Az adatok a böngésző localStorage-ában vannak (nem kell szerver).
//  A szövegek a translations.js-ben vannak (HU / EN / RO).
// =====================================================

// ---------- Nyelv ----------

let currentLang = localStorage.getItem("foodshare_lang") || "hu";

// t("kulcs", {n: 5}) -> a szöveg az aktuális nyelven, a {n} helyére 5 kerül
function t(key, values = {}) {
  let text = TRANSLATIONS[currentLang][key];
  if (text === undefined) return key;
  for (const name in values) {
    text = text.replace("{" + name + "}", values[name]);
  }
  return text;
}

function categoryName(id) {
  return t("cat_" + id);
}

// Az alap automaták neve le van fordítva, az adminnal felvetteké nincs -> akkor a megadott név
// Ha az admin átnevezte (customName), akkor mindig az admin által megadott név látszik
function lockerName(id) {
  const l = getLocker(id);
  if (l && l.customName) return l.name;
  const key = "locker_" + id;
  if (TRANSLATIONS[currentLang][key]) return t(key);
  return l ? l.name : id;
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.title = t("pageTitle");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });

  fillSelects();
  fillPriceForm();
  renderDietInputs();
  renderDietFilter();
  renderRules();
  updateCategoryInfo();
  typedCode = "";
  setScreen(t("enterCode"));
  renderAll();
  if (modalState) openModalFor(modalState.type, modalState.id); // nyitott ablak is fordul
  showPhotoPreview();
  if (typeof demo !== "undefined" && demo.step >= 0) renderDemoPanel(); // a bemutató panel is forduljon
  if (userPos) useLocation(userPos.lat, userPos.lon, false); // a "legközelebbi" üzenet is forduljon
}

document.querySelectorAll(".lang-switch button").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem("foodshare_lang", currentLang);
    applyLanguage();
  });
});

// ---------- Segédfüggvények ----------

// 6 jegyű véletlen kód, ami még nincs használatban
function newCode() {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (donations.some((d) => d.dropCode === code || d.pickupCode === code));
  return code;
}

function formatTime(ms) {
  return new Date(ms).toLocaleString(t("locale"), {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function timeLeft(ms) {
  const diff = ms - now();
  if (diff <= 0) return t("expiredWord");
  const h = Math.floor(diff / HOUR);
  const m = Math.floor((diff % HOUR) / 60000);
  if (h >= 24) return t("leftDays", { d: Math.floor(h / 24), h: h % 24 });
  return h > 0 ? t("leftHours", { h: h, m: m }) : t("leftMin", { m: m });
}

// Időtartam szövegesen: 24 -> "24 óra", 72 -> "3 nap"
function durationText(hours, form = "") {
  return hours >= 48
    ? t(form ? "forDays" : "days", { n: hours / 24 })
    : t(form ? "forHours" : "hours", { n: hours });
}

// A minta-adatok címe nyelvenként más ({hu, en, ro}), a felhasználóé sima szöveg
function titleOf(d) {
  return typeof d.title === "object" ? d.title[currentLang] : d.title;
}

// ---------- Megjelenítés ----------

function renderAll() {
  checkTimers();
  renderDonations();
  renderLockerList();
  updateMarkers();
  renderMachine();
  updateStats();
  renderProfile();
  checkNotifications();
}

function renderRules() {
  document.getElementById("rulesTable").innerHTML = Object.entries(CATEGORIES)
    .map(([id, c]) => `<div class="rule"><span>${c.icon} ${categoryName(id)}</span><strong>${durationText(c.hours)}</strong></div>`)
    .join("");
}

function renderDonations() {
  const list = document.getElementById("donationList");
  const search = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const lockerId = document.getElementById("lockerFilter").value;
  const onlyAvailable = document.getElementById("onlyAvailable").checked;

  const filtered = donations.filter((d) => {
    return titleOf(d).toLowerCase().includes(search)
      && (category === "all" || d.category === category)
      && (lockerId === "all" || d.lockerId === lockerId || (lockerId === "fav" && isFavorite(d.lockerId)))
      && (!onlyAvailable || d.status === "available")
      && matchesPriceFilter(d)
      && matchesDiet(d);
  });

  // A hamarabb lejárók legyenek elöl
  filtered.sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity));

  list.innerHTML = filtered.length === 0
    ? `<p class='empty'>${t("empty")}</p>`
    : filtered.map(createCard).join("");
}

function createCard(d) {
  const cat = CATEGORIES[d.category];
  let info = "";
  let buttons = "";

  if (d.status === "available") {
    const urgent = d.expiresAt - now() < 6 * HOUR ? "urgent" : "";
    info = `<p class="${urgent}">${t("expiresAt", { time: formatTime(d.expiresAt), left: timeLeft(d.expiresAt) })}</p>`;
    buttons = `<button class="btn btn-primary" onclick="reserve(${d.id})">${t("bReserve")}</button>`;
  } else if (d.status === "reserved") {
    info = `<p>${t("reservationValid", { left: timeLeft(d.reservedUntil) })}</p>`;
    buttons = `<button class="btn btn-primary" onclick="openModalFor('pickup', ${d.id})">${t("bShowCode")}</button>
               <button class="btn btn-danger" onclick="cancelReservation(${d.id})">${t("bCancel")}</button>`;
  } else if (d.status === "waiting") {
    info = `<p>${t("dropDeadline", { left: timeLeft(d.dropDeadline) })}</p>`;
    buttons = `<button class="btn btn-primary" onclick="openModalFor('drop', ${d.id})">${t("bDropCode")}</button>
               <button class="btn btn-danger" onclick="removeDonation(${d.id})">${t("bWithdraw")}</button>`;
  } else if (d.status === "expired") {
    info = `<p>${t("expiredAt", { time: formatTime(d.expiresAt) })}</p>`;
    buttons = `<button class="btn btn-secondary" onclick="clearExpired(${d.id})">${t("bCleared")}</button>`;
  } else if (d.status === "cleared") {
    buttons = "";
  } else {
    buttons = `<button class="btn" disabled>${t("bSaved")}</button>`;
  }

  return `
    <div class="card">
      ${photoHtml(d)}
      <span class="tag">${cat.icon} ${categoryName(d.category)}</span>
      <h3>${escapeHtml(titleOf(d))}</h3>
      ${priceTag(d)}
      ${dietChips(d)}
      <p>🍽️ ${t("portions", { n: d.portions })} · 👤 ${escapeHtml(d.donor)}${donorRating(d.donor)}</p>
      <p>🧊 ${t("lockerSlot", { locker: lockerName(d.lockerId), slot: d.slot })}${distanceBadge(d.lockerId)}</p>
      ${info}
      <p class="status status-${d.status}">● ${t("st_" + d.status)}</p>
      <div class="actions">${buttons}</div>
    </div>
  `;
}

// Ha tudjuk, hol van a felhasználó: " · 🚶 650 m"
function distanceBadge(lockerId) {
  const l = getLocker(lockerId);
  return userPos && l ? ` · 🚶 ${formatDistance(distanceTo(l))}` : "";
}

function renderLockerList() {
  const nearest = nearestLocker();
  // Ha ismert a hely, távolság szerint rendezzük
  const list = userPos ? [...lockers].sort((a, b) => distanceTo(a) - distanceTo(b)) : lockers;

  document.getElementById("lockerList").innerHTML = list.map((l) => {
    const broken = isLockerBroken(l);
    const isNearest = nearest && nearest.id === l.id;
    const dist = userPos
      ? `<p class="locker-distance">${t("walk", { dist: formatDistance(distanceTo(l)), min: walkMinutes(distanceTo(l)) })}
           · <a href="${routeLink(l)}" target="_blank" onclick="event.stopPropagation()">${t("route")}</a></p>`
      : "";
    return `
      <div class="locker-card ${broken ? "broken" : ""} ${isNearest ? "nearest" : ""}" onclick="focusLocker('${l.id}')">
        ${isNearest ? `<span class="nearest-badge">⭐ ${t("nearestBadge")}</span>` : ""}
        <h4>🧊 ${lockerName(l.id)} <small>(${l.id})</small> ${favoriteButton(l.id)}</h4>
        <p>📍 ${l.address}</p>
        <p>🌡️ ${l.temp} °C ${broken ? "– <b>" + (l.maintenance ? t("maintenance") : t("tooHot")) + "</b>" : ""}</p>
        <p>${t("lockerInfo", { food: availableCount(l), free: freeSlots(l).length, size: l.size })}</p>
        ${dist}
      </div>
    `;
  }).join("");
}

function updateStats() {
  document.getElementById("statAvailable").textContent = donations.filter((d) => d.status === "available").length;
  document.getElementById("statSaved").textContent = donations
    .filter((d) => d.status === "collected")
    .reduce((sum, d) => sum + d.portions, 0);
  document.getElementById("statFree").textContent = lockers
    .filter((l) => !isLockerBroken(l))
    .reduce((sum, l) => sum + freeSlots(l).length, 0);
}

// ---------- Térkép ----------

const map = L.map("map").setView(MAP_CENTER, 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "© OpenStreetMap",
}).addTo(map);

let markers = {};
function rebuildMarkers() {
  Object.values(markers).forEach((m) => map.removeLayer(m));
  markers = {};
  lockers.forEach((l) => {
    markers[l.id] = L.marker([l.lat, l.lon]).addTo(map);
  });
}
rebuildMarkers();

function updateMarkers() {
  lockers.forEach((l) => {
    const text = l.maintenance
      ? "🛠️ " + t("maintenance")
      : isLockerBroken(l)
      ? t("popupHot", { temp: l.temp })
      : t("popupOk", { food: availableCount(l), free: freeSlots(l).length });
    const dist = userPos ? `<br>🚶 ${formatDistance(distanceTo(l))}` : "";
    markers[l.id].bindPopup(`<b>${lockerName(l.id)}</b><br>${l.address}<br>${text}${dist}<br><a href="${routeLink(l)}" target="_blank">${t("route")}</a>`);
  });
}

// Automata kiválasztása: térkép odaugrik, lista szűr, szimulátor átvált
function focusLocker(id) {
  const l = getLocker(id);
  map.setView([l.lat, l.lon], 15);
  markers[id].openPopup();
  document.getElementById("lockerFilter").value = id;
  document.getElementById("machineSelect").value = id;
  renderAll();
}

// ---------- Műveletek ----------

function reserve(id) {
  const active = donations.filter((d) => d.status === "reserved").length;
  if (active >= MAX_RESERVATIONS) {
    alert(t("maxReservations", { n: MAX_RESERVATIONS }));
    return;
  }
  const d = donations.find((x) => x.id === id);
  // Kedvezményes ételnél előbb fizetni kell (szimulált)
  if (d.price > 0 && !d.paid) {
    openPayment(id);
    return;
  }
  d.status = "reserved";
  d.pickupCode = newCode();
  d.reservedUntil = now() + RESERVATION_HOURS * HOUR;
  saveDonations();
  rememberReserved(id);
  renderAll();
  openModalFor("pickup", id);
}

function cancelReservation(id) {
  const d = donations.find((x) => x.id === id);
  d.status = "available";
  d.pickupCode = null;
  if (d.paid) {
    d.paid = false; // szimulált visszatérítés
    showToast(t("payRefund", { amount: formatLei(d.price) }));
  }
  saveDonations();
  renderAll();
}

// Lejárt étel kiürítése: a rekesz felszabadul, de a statisztikához megtartjuk
function clearExpired(id) {
  const d = donations.find((x) => x.id === id);
  d.status = "cleared";
  saveDonations();
  renderAll();
}

// Visszavonás (még nincs betöltve) -> törlés
function removeDonation(id) {
  donations = donations.filter((x) => x.id !== id);
  saveDonations();
  renderAll();
}

// ---------- Kód ablak + QR ----------

let modalState = null; // melyik ablak van nyitva: { type: "pickup" | "drop", id }

function openModalFor(type, id) {
  const d = donations.find((x) => x.id === id);
  if (!d) return;
  const l = getLocker(d.lockerId);
  const code = type === "pickup" ? d.pickupCode : d.dropCode;
  if (!code) return;
  modalState = { type, id };

  const where = `${t("lockerSlot", { locker: lockerName(l.id), slot: d.slot })} (${l.address})`;
  document.getElementById("modalTitle").textContent = type === "pickup" ? t("pickupTitle") : t("dropTitle");
  document.getElementById("modalText").textContent = type === "pickup" ? `${titleOf(d)} – ${where}` : where;
  document.getElementById("modalCode").textContent = code.slice(0, 3) + " " + code.slice(3);
  document.getElementById("modalFoot").textContent = type === "pickup"
    ? t("pickupFoot", { time: formatTime(d.reservedUntil) })
    : t("dropFoot", { time: formatTime(d.dropDeadline) });

  const qr = document.getElementById("qrcode");
  qr.innerHTML = "";
  new QRCode(qr, { text: `FOODSHARE|${l.id}|${code}`, width: 160, height: 160 });

  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  modalState = null;
  document.getElementById("modal").classList.add("hidden");
}

document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal(); // kattintás a háttérre
});

// ---------- Új adomány ----------

function updateCategoryInfo() {
  const category = document.getElementById("category").value;
  const c = CATEGORIES[category];
  const note = t("note_" + category);
  const expiry = calculateExpiry(category, document.getElementById("labelDate").value, now());
  document.getElementById("categoryInfo").innerHTML =
    `${c.icon} ${t("catInfo", { time: durationText(c.hours, "for") })}${note ? " (" + note + ")" : ""}.<br>` +
    t("ifLoadedNow", { time: formatTime(expiry) });
}

document.getElementById("donationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const message = document.getElementById("formMessage");
  const locker = getLocker(document.getElementById("locker").value);

  if (isLockerBroken(locker)) {
    message.textContent = locker.maintenance ? "❌ " + t("maintenance") : t("msgBroken");
    return;
  }
  const free = freeSlots(locker);
  if (free.length === 0) {
    message.textContent = t("msgNoSlot");
    return;
  }

  const d = {
    id: Date.now(),
    title: document.getElementById("title").value.trim(),
    category: document.getElementById("category").value,
    labelDate: document.getElementById("labelDate").value || null,
    portions: Number(document.getElementById("portions").value),
    donor: document.getElementById("donor").value.trim(),
    lockerId: locker.id,
    slot: free[0],
    status: "waiting",
    createdAt: now(),
    dropCode: newCode(),
    dropDeadline: now() + DROP_OFF_HOURS * HOUR,
    photo: pendingPhoto,
    tags: readDietFromForm(),
    ...readPriceFromForm(),
  };

  donations.unshift(d);
  try {
    saveDonations();
  } catch (e) {
    // Megtelt a tároló (kb. 5 MB) – valószínűleg a sok fotó miatt
    donations.shift();
    message.textContent = t("msgPhotoTooBig");
    return;
  }
  rememberDonated(d.id);
  clearPhoto();
  event.target.reset();
  updatePricePreview();
  if (profile.name) document.getElementById("donor").value = profile.name;
  updateCategoryInfo();
  message.textContent = t("msgOk");
  setTimeout(() => (message.textContent = ""), 4000);
  renderAll();
  openModalFor("drop", d.id);
});

// ---------- Automata szimulátor ----------

let typedCode = "";
let openedSlot = null; // melyik rekesz ajtaja van épp nyitva (animáció)

function buildKeypad() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"];
  document.getElementById("keypad").innerHTML = keys
    .map((k) => `<button class="key ${k === "OK" ? "key-ok" : ""} ${k === "C" ? "key-c" : ""}" onclick="pressKey('${k}')">${k}</button>`)
    .join("");
}

function setScreen(text, type = "") {
  const screen = document.getElementById("screen");
  screen.textContent = text;
  screen.className = "screen " + type;
}

function pressKey(key) {
  if (key === "C") {
    typedCode = "";
    setScreen(t("enterCode"));
  } else if (key === "OK") {
    submitCode();
  } else if (typedCode.length < 6) {
    typedCode += key;
    setScreen(typedCode.padEnd(6, "_").split("").join(" "));
  }
}

function submitCode() {
  const locker = getLocker(document.getElementById("machineSelect").value);
  const code = typedCode;
  typedCode = "";

  if (isLockerBroken(locker)) {
    setScreen(locker.maintenance ? "🛠️ " + t("maintenance") : t("scrLocked"), "error");
    return;
  }

  const d = donations.find((x) => x.dropCode === code || x.pickupCode === code);

  if (!d) {
    setScreen(t("scrInvalid"), "error");
    return;
  }
  if (d.lockerId !== locker.id) {
    setScreen(t("scrWrongLocker", { locker: lockerName(d.lockerId) }), "error");
    return;
  }

  if (d.status === "waiting" && d.dropCode === code) {
    // Betöltés: itt indul a lejárat
    d.status = "available";
    d.loadedAt = now();
    d.expiresAt = calculateExpiry(d.category, d.labelDate, d.loadedAt);
    d.dropCode = null;
    setScreen(t("scrOpenLoad", { slot: d.slot }), "ok");
  } else if (d.status === "reserved" && d.pickupCode === code) {
    d.status = "collected";
    d.collectedAt = now(); // a nyomon követési naplóhoz
    d.pickupCode = null;
    rememberCollected(d.id);
    if (profile.collected.includes(d.id)) setTimeout(() => openRating(d.id), 3200); // ajtó becsukódik -> értékelés
    setScreen(t("scrOpenPickup", { slot: d.slot }), "ok");
  } else {
    setScreen(t("scrNoLonger"), "error");
    return;
  }

  saveDonations();
  openedSlot = d.slot;
  renderAll();
  setTimeout(() => { openedSlot = null; renderMachine(); }, 3000); // ajtó becsukódik
}

function renderMachine() {
  const locker = getLocker(document.getElementById("machineSelect").value);
  const broken = isLockerBroken(locker);
  const temp = document.getElementById("machineTemp");
  temp.textContent = locker.maintenance
    ? `🛠️ ${t("maintenance")}`
    : `🌡️ ${locker.temp} °C – ${broken ? t("tempLocked") : t("tempOk")}`;
  temp.className = "machine-temp " + (broken ? "bad" : "good");

  let html = "";
  for (let i = 1; i <= locker.size; i++) {
    const d = donations.find((x) => x.lockerId === locker.id && x.slot === i && occupiesSlot(x));
    let cls = "c-free";
    let label = t("slotFree");
    if (d) {
      if (d.status === "waiting") { cls = "c-waiting"; label = t("slotWaiting"); }
      else if (d.status === "available") { cls = "c-full"; label = CATEGORIES[d.category].icon + " " + escapeHtml(titleOf(d)); }
      else if (d.status === "reserved") { cls = "c-reserved"; label = t("slotReserved"); }
      else if (d.status === "expired") { cls = "c-expired"; label = t("slotExpired"); }
    }
    const open = openedSlot === i ? "open" : "";
    html += `<div class="slot ${cls} ${open}"><span class="slot-nr">${i}</span><span class="slot-label">${label}</span></div>`;
  }
  document.getElementById("compartments").innerHTML = html;
}

// ---------- Legördülő listák feltöltése (nyelvváltáskor újra) ----------

function fillSelects() {
  // Megjegyezzük, mi volt kiválasztva, hogy nyelvváltás után is az maradjon
  const keep = ["categoryFilter", "category", "lockerFilter", "locker", "machineSelect"]
    .map((id) => [id, document.getElementById(id).value]);

  const catOptions = Object.keys(CATEGORIES).map((id) => `<option value="${id}">${categoryName(id)}</option>`).join("");
  document.getElementById("categoryFilter").innerHTML = `<option value="all">${t("allCategories")}</option>` + catOptions;
  document.getElementById("category").innerHTML = catOptions;

  const lockerOptions = lockers.map((l) => `<option value="${l.id}">${lockerName(l.id)} (${l.address})</option>`).join("");
  document.getElementById("lockerFilter").innerHTML = `<option value="all">${t("allLockers")}</option>` +
    `<option value="fav">⭐ ${t("favLockers")}</option>` + lockerOptions;
  document.getElementById("locker").innerHTML = lockerOptions;
  document.getElementById("machineSelect").innerHTML = lockerOptions;

  keep.forEach(([id, value]) => {
    // csak akkor állítjuk vissza, ha még létezik (pl. az admin közben törölhetett egy automatát)
    if (value === "all" || value === "fav" || CATEGORIES[value] || getLocker(value)) document.getElementById(id).value = value;
  });
}

// ---------- Indulás ----------

buildKeypad();

document.getElementById("searchInput").addEventListener("input", renderDonations);
document.getElementById("categoryFilter").addEventListener("change", renderDonations);
document.getElementById("lockerFilter").addEventListener("change", renderDonations);
document.getElementById("onlyAvailable").addEventListener("change", renderDonations);
document.getElementById("priceFilter").addEventListener("change", renderDonations);
document.getElementById("category").addEventListener("change", updateCategoryInfo);
document.getElementById("labelDate").addEventListener("change", updateCategoryInfo);
document.getElementById("machineSelect").addEventListener("change", () => {
  typedCode = "";
  setScreen(t("enterCode"));
  renderMachine();
});

// A csomagolási dátum nem lehet a múltban
document.getElementById("labelDate").min = new Date().toISOString().slice(0, 10);

if (profile.name) document.getElementById("donor").value = profile.name;

applyLanguage(); // ez minden szöveget kitölt és mindent kirajzol

// Ha az admin egy másik fülön változtat valamit, itt is frissül
// A jelölőket csak akkor építjük újra, ha az automaták helye/száma változott
// (a szenzorszimuláció 3 másodpercenként ment, ilyenkor csak a hőmérséklet változik)
let markerSignature = lockers.map((l) => l.id + l.lat + l.lon).join("|");

onDataChangedElsewhere(() => {
  const signature = lockers.map((l) => l.id + l.lat + l.lon).join("|");
  if (signature !== markerSignature) {
    markerSignature = signature;
    rebuildMarkers();
    fillSelects();
  }
  renderAll();
});
setInterval(renderAll, 30000); // fél percenként frissít (visszaszámlálás, lejárat)

// Ha be van állítva a Firebase, csatlakozunk a felhőhöz (ha nincs, nem történik semmi)
initCloud();
