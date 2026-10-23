# 🥕 FoodShare – hűtött ételmentő automaták

Egyetemi projekt . Olyan, mint egy EasyBox, csak ételnek: az adományozó (bolt, étterem, magánszemély)
betölti a felesleges ételt egy hűtött automatába, más pedig egy kóddal elviheti.

## Funkciók
**Felhasználóknak (`index.html`)**
- Térkép az automatákkal (Leaflet + OpenStreetMap), legközelebbi automata útvonallal
- Adományozás: kategória szerinti automatikus lejárat, fotó, diéta/allergén címkék, ingyenes vagy kedvezményes eladás
- 6 jegyű kód + QR-kód, automata-szimulátor számbillentyűzettel, QR beolvasás kamerával vagy képből
- Foglalás (szimulált fizetés a kedvezményes ételeknél), átvétel, értékelés, hibabejelentés
- Profil: hatás (kg, CO₂, megspórolt pénz), kitűzők, kedvencek, értesítések
- 3 nyelv (HU / EN / RO), sötét mód, telepíthető app (PWA), bemutató mód

**Cégeknek (`cegeknek.html`)**
- A 2026-os romániai ételpazarlási szabályok összefoglalója, önellenőrző teszt, csomagok, letölthető sablonok, jelentkezés

**Adminnak (`admin.html`)**
- Statisztikák, automaták kezelése (áthelyezés a térképen), élő hűtőszenzor-szimuláció riasztással
- Adományok, visszajelzések, érdeklődő cégek, átadási napló (CSV), nyomtatható éves jelentés

## Fájlok
| Fájl | Mire való |
|---|---|
| `data.js` | Közös adatok: kategóriák, automaták, adományok, mentés |
| `translations.js`, `business-translations.js` | Minden szöveg 3 nyelven |
| `script.js` | A főoldal fő logikája |
| `location.js`, `photo.js`, `profile.js`, `notify.js`, `rating.js`, `qrscan.js`, `pricing.js`, `diet.js`, `demo.js` | Egy-egy funkció |
| `admin.js`, `report.js`, `sensors.js` | Admin felület |
| `business.js`, `templates.js` | Cégeknek oldal |
| `cloud.js`, `firebase-config.js`, `firestore.rules` | Felhő (Firebase) – opcionális |
| `theme.js`, `pwa.js`, `sw.js`, `manifest.json` | Sötét mód, telepíthető app |

## Futtatás
VS Code → jobb klikk az `index.html`-en → **Open with Live Server**.

- Felhő beállítása: [`FIREBASE-BEALLITAS.md`](FIREBASE-BEALLITAS.md)
- Közzététel az interneten: [`KOZZETETEL.md`](KOZZETETEL.md)

## Technológiák
HTML, CSS, JavaScript (keretrendszer nélkül), Leaflet, OpenStreetMap, qrcodejs, jsQR, Firebase (Firestore + Auth), localStorage, Service Worker.
