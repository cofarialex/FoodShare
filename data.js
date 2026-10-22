// =====================================================
//  Közös adatok – ezt használja a főoldal (script.js) ÉS az admin (admin.js) is
//  Minden a böngésző localStorage-ában van tárolva.
// =====================================================

// ---------- Beállítások ----------

// Kategóriák: meddig maradhat bent az étel (órában). A nevük a translations.js-ben: cat_...
const CATEGORIES = {
  cooked:   { hours: 24,  icon: "🍲" },
  sandwich: { hours: 24,  icon: "🥪" },
  dairy:    { hours: 48,  icon: "🥛" },
  bakery:   { hours: 48,  icon: "🥖" },
  produce:  { hours: 72,  icon: "🍎" },
  packaged: { hours: 168, icon: "🥫" },
};

const RESERVATION_HOURS = 2;     // ennyi ideig érvényes egy foglalás
const DROP_OFF_HOURS = 2;        // ennyi ideje van az adományozónak betölteni
const MAX_RESERVATIONS = 2;      // egyszerre max ennyi aktív foglalás
const MAX_SAFE_TEMP = 8;         // e fölött a hűtő zárolva (élelmiszer-biztonság)
const MAP_CENTER = [46.5425, 24.5650]; // Marosvásárhely
const HOUR = 60 * 60 * 1000;     // egy óra ezredmásodpercben

const DONATIONS_KEY = "foodshare_lockers_v2";
const LOCKERS_KEY = "foodshare_lockerlist_v1";

// Az alap automaták (Marosvásárhely). Ha az admin módosít, a localStorage-ba mentődik.
// A "name" csak akkor kell, ha a translations.js-ben nincs locker_ID fordítás (pl. adminnal felvett automata)
// A koordináták az OpenStreetMap adataiból (2026. 10. 20.)
const DEFAULT_LOCKERS = [
  { id: "A1", name: "Rózsák tere",      address: "Piața Trandafirilor",         lat: 46.54451, lon: 24.56138, size: 8, temp: 4.1, maintenance: false },
  { id: "B2", name: "Tudor negyed",     address: "Str. Tudor Vladimirescu",     lat: 46.53712, lon: 24.57423, size: 6, temp: 3.6, maintenance: false },
  { id: "C3", name: "Kövesdomb",        address: "Bd. 1848 (Dâmbul Pietros)",   lat: 46.53184, lon: 24.55762, size: 6, temp: 4.8, maintenance: false },
  { id: "D4", name: "Egyetemi kampusz", address: "Str. Gheorghe Marinescu 38",  lat: 46.55495, lon: 24.58167, size: 8, temp: 9.4, maintenance: false },
];

// ---------- Segédfüggvények ----------

function now() {
  return Date.now();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// A lejárat: a kategória szerinti határidő, VAGY a csomagoláson lévő dátum, ha az korábbi
function calculateExpiry(category, labelDate, loadedAt) {
  let expiry = loadedAt + CATEGORIES[category].hours * HOUR;
  if (labelDate) {
    const label = new Date(labelDate + "T23:59").getTime();
    expiry = Math.min(expiry, label);
  }
  return expiry;
}

// ---------- Automaták ----------

function loadLockers() {
  const saved = localStorage.getItem(LOCKERS_KEY);
  if (!saved) return structuredClone(DEFAULT_LOCKERS);
  const list = JSON.parse(saved);

  // Egyszeri javítás: a korábban elmentett automaták rossz helyen voltak -> a pontos helyre tesszük őket
  // (a többi beállítás – név, hőmérséklet, karbantartás – megmarad)
  if (!localStorage.getItem("foodshare_location_fix_1")) {
    DEFAULT_LOCKERS.forEach((def) => {
      const l = list.find((x) => x.id === def.id);
      if (l) { l.lat = def.lat; l.lon = def.lon; l.address = def.address; }
    });
    localStorage.setItem(LOCKERS_KEY, JSON.stringify(list));
    localStorage.setItem("foodshare_location_fix_1", "1");
  }
  return list;
}

function saveLockers() {
  localStorage.setItem(LOCKERS_KEY, JSON.stringify(lockers));
}

let lockers = loadLockers();

function getLocker(id) {
  return lockers.find((l) => l.id === id);
}

// Zárolva, ha túl meleg VAGY az admin karbantartásra állította
function isLockerBroken(locker) {
  return locker.temp > MAX_SAFE_TEMP || locker.maintenance;
}

// ---------- Adományok ----------
// Egy adomány állapotai (status):
//   "waiting" (betöltésre vár) -> "available" (elérhető) -> "reserved" (lefoglalva) -> "collected" (átvéve)
//   "expired" (lejárt) -> "cleared" (kiürítve – a statisztikához megtartjuk)

function createSampleData() {
  const time = now();
  return [
    { id: 1, title: { hu: "15 db kifli és zsemle", en: "15 bread rolls", ro: "15 cornuri și chifle" },
      category: "bakery", portions: 15, donor: "Kis Pékség", createdAt: time - 4 * HOUR, tags: ["vegetarian", "lactosefree"],
      lockerId: "A1", slot: 1, status: "available", loadedAt: time - 3 * HOUR, expiresAt: time + 45 * HOUR },
    { id: 2, title: { hu: "Zöldségleves (5 doboz)", en: "Vegetable soup (5 boxes)", ro: "Supă de legume (5 caserole)" },
      category: "cooked", portions: 5, donor: "Napfény Bisztró", createdAt: time - 21 * HOUR, tags: ["vegan", "glutenfree"], price: 12, originalPrice: 30,
      lockerId: "A1", slot: 2, status: "available", loadedAt: time - 20 * HOUR, expiresAt: time + 4 * HOUR },
    { id: 3, title: { hu: "Alma (3 kg)", en: "Apples (3 kg)", ro: "Mere (3 kg)" },
      category: "produce", portions: 10, donor: "Kovács Anna", createdAt: time - 11 * HOUR, tags: ["vegan", "glutenfree", "lactosefree"],
      lockerId: "B2", slot: 1, status: "available", loadedAt: time - 10 * HOUR, expiresAt: time + 62 * HOUR },
    { id: 4, title: { hu: "Joghurtok", en: "Yogurts", ro: "Iaurturi" },
      category: "dairy", portions: 6, donor: "Mini Market", createdAt: time - 6 * HOUR, tags: ["vegetarian", "glutenfree"], price: 9, originalPrice: 18,
      lockerId: "B2", slot: 3, status: "available", loadedAt: time - 5 * HOUR, expiresAt: time + 43 * HOUR },
    { id: 5, title: { hu: "Szendvicsek", en: "Sandwiches", ro: "Sandvișuri" },
      category: "sandwich", portions: 4, donor: "Café Uni", createdAt: time - 27 * HOUR,
      lockerId: "C3", slot: 2, status: "expired", loadedAt: time - 26 * HOUR, expiresAt: time - 2 * HOUR },
    { id: 6, title: { hu: "Tészta és konzervek", en: "Pasta and canned food", ro: "Paste și conserve" },
      category: "packaged", portions: 8, donor: "Szabó Péter", createdAt: time - 31 * HOUR,
      lockerId: "C3", slot: 4, status: "collected", loadedAt: time - 30 * HOUR, expiresAt: time + 138 * HOUR,
      rating: { stars: 5, problems: [], comment: "Köszönöm, nagyon jól jött!", at: time - 25 * HOUR, resolved: true } },
    { id: 7, title: { hu: "Pogácsa", en: "Savory scones", ro: "Pogăcele" },
      category: "bakery", portions: 12, donor: "Kis Pékség", createdAt: time - 50 * HOUR, tags: ["vegetarian", "eggs"], price: 10, originalPrice: 25, paid: true,
      lockerId: "A1", slot: 3, status: "collected", loadedAt: time - 49 * HOUR, expiresAt: time - 1 * HOUR,
      rating: { stars: 3, problems: ["dirty"], comment: "A pogácsa finom volt, de a rekesz kicsit meleg volt.", at: time - 40 * HOUR, resolved: false } },
    { id: 8, title: { hu: "Rakott krumpli", en: "Layered potatoes", ro: "Cartofi franțuzești" },
      category: "cooked", portions: 6, donor: "Napfény Bisztró", createdAt: time - 60 * HOUR,
      lockerId: "B2", slot: 2, status: "cleared", loadedAt: time - 59 * HOUR, expiresAt: time - 35 * HOUR },
  ];
}

function loadDonations() {
  const saved = localStorage.getItem(DONATIONS_KEY);
  return saved ? JSON.parse(saved) : createSampleData();
}

function saveDonations() {
  localStorage.setItem(DONATIONS_KEY, JSON.stringify(donations));
}

let donations = loadDonations();

// Ami még rekeszt foglal (az átvett és a kiürített már nem)
function occupiesSlot(d) {
  return d.status !== "collected" && d.status !== "cleared";
}

function freeSlots(locker) {
  const used = donations.filter((d) => d.lockerId === locker.id && occupiesSlot(d)).map((d) => d.slot);
  const free = [];
  for (let i = 1; i <= locker.size; i++) {
    if (!used.includes(i)) free.push(i);
  }
  return free;
}

function availableCount(locker) {
  return donations.filter((d) => d.lockerId === locker.id && d.status === "available").length;
}

// Lejárt ételek, lejárt foglalások, be nem töltött rekeszek kezelése
function checkTimers() {
  const time = now();
  donations.forEach((d) => {
    if ((d.status === "available" || d.status === "reserved") && d.expiresAt <= time) {
      d.status = "expired";
    }
    if (d.status === "reserved" && d.reservedUntil <= time) {
      d.status = "available"; // a foglalás lejárt, újra elérhető
      d.pickupCode = null;
    }
  });
  // Ha az adományozó nem töltötte be időben, a rekesz felszabadul
  donations = donations.filter((d) => !(d.status === "waiting" && d.dropDeadline <= time));
  saveDonations();
}

// Ha egy másik fülön (pl. az adminban) változnak az adatok, itt is frissüljenek
// Itt gyűlnek a "szólj, ha változott az adat" függvények (a cloud.js is ezeket hívja)
const dataListeners = [];

function onDataChangedElsewhere(callback) {
  dataListeners.push(callback);
  window.addEventListener("storage", (e) => {
    if (e.key === DONATIONS_KEY || e.key === LOCKERS_KEY) {
      donations = loadDonations();
      lockers = loadLockers();
      callback();
    }
  });
}
