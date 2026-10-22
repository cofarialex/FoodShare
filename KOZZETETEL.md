# FoodShare közzététele az interneten (ingyen)

Két lehetőség van. Mindkettő ingyenes, és a végén kapsz egy **https://** címet, amit bárki megnyithat (telefonon is, és telepíthető appként is működik).

---

## A) GitHub Pages – a legegyszerűbb, parancssor nélkül

1. Regisztrálj: https://github.com (ha még nincs fiókod).
2. Jobb fent **+ → New repository**
   - Repository name: `foodshare`
   - **Public**
   - Pipáld be: **Add a README file**
   - **Create repository**
3. A repository oldalán: **Add file → Upload files**
4. A Finderben nyisd meg a `Projektek/FoodShare` mappát, jelöld ki **az összes fájlt és az `icons` mappát**, és húzd be a böngészőbe.
5. Lent: **Commit changes**.
6. **Settings → Pages** (bal oldalt)
   - Source: **Deploy from a branch**
   - Branch: **main**, mappa: **/ (root)** → **Save**
7. 1–2 perc múlva fent megjelenik a cím, valami ilyesmi:
   `https://FELHASZNALONEV.github.io/foodshare/`

**Frissítés később:** ugyanígy **Add file → Upload files**, és húzd be a megváltozott fájlokat (felülírja őket).

---

## B) Firebase Hosting – ha már úgyis Firebase-t használsz

Ehhez kell a Terminal és a Node.js.

```bash
npm install -g firebase-tools     # egyszer kell telepíteni
cd ~/Projektek/FoodShare
firebase login                    # megnyílik a böngésző, ott jelentkezz be
firebase init hosting             # válaszd a meglévő projektedet; public directory: .  ; single-page app: No
firebase deploy                   # feltöltés
```

A végén kiírja a címet: `https://PROJEKTNEV.web.app`

---

## Fontos a közzététel után

- **Firebase használatakor:** a Firebase konzolban **Authentication → Settings → Authorized domains** alatt add hozzá az új címet
  (pl. `felhasznalonev.github.io`), különben az admin belépés nem fog működni.
- Az `admin.html` címe is nyilvános lesz, de jelszó nélkül nem lehet belépni.
- Telefonon nyisd meg a címet → böngésző menü → **„Hozzáadás a kezdőképernyőhöz”** → és máris appként működik.
