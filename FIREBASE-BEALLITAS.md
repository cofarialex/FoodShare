# FoodShare – Firebase (felhő) beállítás

Felhő nélkül minden adat csak a saját böngésződben van. Firebase-szel **minden eszközön ugyanazt látod** (laptop, telefon, a tanár gépe).

## 1. Projekt és webes app
1. https://console.firebase.google.com → **Add project** → név: `foodshare` (Analytics nem kell).
2. A projekt főoldalán a **`</>`** (Web) ikon → app neve: `FoodShare`.
3. Másold ki a `firebaseConfig = { ... }` részt.

## 2. A konfiguráció beírása
Nyisd meg a `firebase-config.js` fájlt, és a `const FIREBASE_CONFIG = null;` sort cseréld le erre:

```js
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

## 3. Adatbázis
**Build → Firestore Database → Create database** → helyszín: `europe-west3` (Frankfurt) → **Production mode**.

## 4. Biztonsági szabályok
**Firestore Database → Rules** fül → töröld ki, ami ott van → másold be a `firestore.rules` fájl tartalmát →
írd át az `ADMIN_EMAIL` szót a saját admin e-mail-címedre → **Publish**.

## 5. Bejelentkezés
**Build → Authentication → Get started → Sign-in method**:
- **Anonymous** → Enable (a felhasználók regisztráció nélkül használhatják)
- **Email/Password** → Enable (admin belépés)

**Users** fül → **Add user** → a saját e-mail-címed + erős jelszó. ⚠️ A jelszót senkinek ne add meg.

## 6. Első indítás
1. Nyisd meg az `admin.html`-t (Live Serverrel), és lépj be az admin e-maillel és jelszóval.
2. Az automaták első alkalommal automatikusan feltöltődnek a felhőbe.
3. Ha szeretnél mintaadatokat: **Beállítások → Mintaadatok visszaállítása**.
4. Nyisd meg a főoldalt egy másik eszközön is – ugyanazt fogod látni. 🎉

## Ismert korlátok (prototípus)
- Az átvételi kódok az adatbázisban vannak, amit technikailag bárki kiolvashatna. Éles rendszerben ezt szerveroldali kód
  (pl. Firebase Cloud Functions) kezelné, a kódok nem lennének nyilvánosak.
- A „Profilom” adatai továbbra is a saját böngésződben vannak (nincs felhasználói fiók).
- Az ingyenes Firebase csomag (Spark) bőven elég egy egyetemi projekthez.
