// =====================================================
//  Felhő szinkronizálás (Firebase Firestore)
//  Hogyan működik?
//  1) Az app először a böngészőben tárolt adatokkal indul (gyors, internet nélkül is megy).
//  2) Ha van FIREBASE_CONFIG, betöltjük a Firebase-t, és "feliratkozunk" az adatbázisra:
//     ha bárki bármit változtat (bármelyik eszközön), azonnal megkapjuk és újrarajzolunk.
//  3) Amikor mi mentünk (saveDonations / saveLockers), csak a MEGVÁLTOZOTT tételeket küldjük fel.
//
//  Gyűjtemények (collections) az adatbázisban:
//    donations – adományok (mindenki olvashatja, bejelentkezett felhasználó írhatja)
//    lockers   – automaták (mindenki olvashatja, csak az admin írhatja)
//    leads     – érdeklődő cégek (bárki beküldheti, csak az admin olvashatja)
// =====================================================

const FIREBASE_VERSION = "10.12.2";

const CLOUD = {
  enabled: typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG !== null,
  ready: false,
  db: null,
  auth: null,
  isAdmin: false,
  leads: [],
  synced: { donations: {}, lockers: {}, leads: {} }, // amit utoljára láttunk a felhőben (id -> JSON szöveg)
};

// Script betöltése (a Firebase könyvtárakat csak akkor töltjük le, ha kell)
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Nem sikerült betölteni: " + src));
    document.head.appendChild(s);
  });
}

async function loadFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
  if (!window.firebase) {
    await loadScript(base + "firebase-app-compat.js");
    await loadScript(base + "firebase-auth-compat.js");
    await loadScript(base + "firebase-firestore-compat.js");
  }
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  CLOUD.auth = firebase.auth();
  CLOUD.db = firebase.firestore();
}

// Szól minden feliratkozónak (főoldal, admin), hogy új adat jött
function notifyListeners() {
  if (typeof dataListeners !== "undefined") dataListeners.forEach((cb) => cb());
}

// ---------- Felküldés: csak a különbségek ----------

async function pushDiff(name, list) {
  if (!CLOUD.ready) return;
  const synced = CLOUD.synced[name];
  const batch = CLOUD.db.batch();
  let changes = 0;
  const ids = new Set();

  list.forEach((item) => {
    const id = String(item.id);
    ids.add(id);
    const json = JSON.stringify(item);
    if (synced[id] !== json) {
      batch.set(CLOUD.db.collection(name).doc(id), JSON.parse(json));
      synced[id] = json;
      changes++;
    }
  });
  Object.keys(synced).forEach((id) => {
    if (!ids.has(id)) {
      batch.delete(CLOUD.db.collection(name).doc(id));
      delete synced[id];
      changes++;
    }
  });

  if (changes > 0) {
    try {
      await batch.commit();
    } catch (e) {
      console.warn("[FoodShare] Felhő mentés sikertelen (" + name + "):", e.message);
    }
  }
}

// ---------- Feliratkozás a változásokra ----------

function subscribe(name, onData) {
  return CLOUD.db.collection(name).onSnapshot((snap) => {
    const items = snap.docs.map((doc) => doc.data());
    CLOUD.synced[name] = {};
    items.forEach((item) => (CLOUD.synced[name][String(item.id)] = JSON.stringify(item)));
    onData(items);
  }, (err) => console.warn("[FoodShare] Feliratkozás hiba (" + name + "):", err.message));
}

function subscribeAppData() {
  if (typeof saveDonations !== "function") return; // pl. a Cégeknek oldalon nincs rá szükség

  subscribe("donations", (items) => {
    donations = items;
    localStorage.setItem(DONATIONS_KEY, JSON.stringify(donations)); // helyi másolat (gyors indulás)
    notifyListeners();
  });

  subscribe("lockers", (items) => {
    if (items.length === 0) {
      // Üres még a felhő: az admin feltölti az alap automatákat
      if (CLOUD.isAdmin) pushDiff("lockers", lockers);
      return;
    }
    lockers = items;
    localStorage.setItem(LOCKERS_KEY, JSON.stringify(lockers));
    notifyListeners();
  });
}

function subscribeLeads() {
  subscribe("leads", (items) => {
    CLOUD.leads = items.sort((a, b) => b.createdAt - a.createdAt);
    notifyListeners();
  });
}

// ---------- A mentő függvények "kiegészítése" ----------
// A data.js saveDonations/saveLockers csak a böngészőbe ment – itt hozzátesszük a felhőt is.

function patchSaveFunctions() {
  if (typeof saveDonations !== "function") return;
  const localSaveDonations = saveDonations;
  const localSaveLockers = saveLockers;
  saveDonations = function () {
    localSaveDonations();
    pushDiff("donations", donations);
  };
  saveLockers = function () {
    localSaveLockers();
    if (CLOUD.isAdmin) pushDiff("lockers", lockers); // automatákat csak az admin módosíthat
  };
}

// ---------- Admin belépés (e-mail + jelszó a Firebase-ben) ----------

async function cloudAdminSignIn(email, password) {
  await CLOUD.auth.signInWithEmailAndPassword(email, password);
}

async function cloudSignOut() {
  await CLOUD.auth.signOut();
}

async function cloudAddLead(lead) {
  await CLOUD.db.collection("leads").doc(String(lead.id)).set(lead);
}

// ---------- Indulás ----------

async function initCloud({ admin = false, onAdminChange = null } = {}) {
  if (!CLOUD.enabled) return;
  try {
    await loadFirebase();
    patchSaveFunctions();

    CLOUD.auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // A főoldalon és a Cégeknek oldalon névtelenül (regisztráció nélkül) jelentkezünk be
        if (!admin) await CLOUD.auth.signInAnonymously();
        if (onAdminChange) onAdminChange(false);
        return;
      }
      CLOUD.isAdmin = !user.isAnonymous;
      if (!CLOUD.ready) {
        CLOUD.ready = true;
        subscribeAppData();
      }
      if (CLOUD.isAdmin) subscribeLeads();
      if (onAdminChange) onAdminChange(CLOUD.isAdmin);
    });
  } catch (e) {
    console.warn("[FoodShare] A felhő nem érhető el, helyi módban futunk:", e.message);
    CLOUD.enabled = false;
  }
}
