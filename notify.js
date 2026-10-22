// =====================================================
//  Kedvenc automaták + értesítések
//  - ⭐ kedvencnek jelölhetsz automatákat
//  - ha egy kedvenc automatába új étel kerül -> értesítés
//  - ha a foglalásod 30 percen belül lejár -> emlékeztető
//  Az értesítés kétféle: felugró "toast" az oldalon + rendszerértesítés (Notification API), ha engedélyezted.
// =====================================================

const REMIND_BEFORE_MIN = 30;

function isFavorite(lockerId) {
  return profile.favorites.includes(lockerId);
}

function toggleFavorite(lockerId, event) {
  if (event) event.stopPropagation(); // ne fusson le a kártyára kattintás is
  if (isFavorite(lockerId)) {
    profile.favorites = profile.favorites.filter((id) => id !== lockerId);
  } else {
    profile.favorites.push(lockerId);
    showToast(t("favAdded", { locker: lockerName(lockerId) }));
  }
  saveProfile();
  renderAll();
}

function favoriteButton(lockerId) {
  const fav = isFavorite(lockerId);
  return `<button class="fav-button ${fav ? "on" : ""}" title="${t(fav ? "favRemove" : "favAdd")}"
            onclick="toggleFavorite('${lockerId}', event)">${fav ? "★" : "☆"}</button>`;
}

// ---------- Toast (kis felugró üzenet a jobb alsó sarokban) ----------

function showToast(html, seconds = 5) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = html;
  toast.addEventListener("click", () => toast.remove());
  document.getElementById("toasts").appendChild(toast);
  setTimeout(() => toast.classList.add("hide"), seconds * 1000);
  setTimeout(() => toast.remove(), seconds * 1000 + 400);
}

// ---------- Rendszerértesítés ----------

function notificationsSupported() {
  return "Notification" in window;
}

function notify(title, body) {
  showToast(`<b>${title}</b><br>${body}`, 8);
  if (profile.notifications && notificationsSupported() && Notification.permission === "granted") {
    try {
      new Notification(title, { body: body.replace(/<[^>]+>/g, ""), icon: "icons/icon-192.png" });
    } catch (e) {
      // néhány böngésző (pl. telefonon) csak service workeren keresztül enged értesítést – ilyenkor marad a toast
    }
  }
}

async function toggleNotifications() {
  if (profile.notifications) {
    profile.notifications = false;
  } else {
    profile.notifications = true;
    if (notificationsSupported() && Notification.permission === "default") {
      await Notification.requestPermission(); // a böngésző megkérdezi a felhasználót
    }
  }
  saveProfile();
  renderNotificationSettings();
}

function testNotification() {
  notify(t("notifTestTitle"), t("notifTestBody"));
}

function renderNotificationSettings() {
  const on = profile.notifications;
  const button = document.getElementById("notifToggle");
  button.textContent = on ? t("notifOff") : t("notifOn");
  button.className = "btn " + (on ? "btn-secondary" : "btn-primary");

  let status = on ? t("notifStatusOn") : t("notifStatusOff");
  if (on && notificationsSupported() && Notification.permission === "denied") status += " " + t("notifBlocked");
  if (on && !notificationsSupported()) status += " " + t("notifNoSupport");
  document.getElementById("notifStatus").textContent = status;

  document.getElementById("favoriteList").innerHTML = profile.favorites.length
    ? profile.favorites.filter(getLocker).map((id) =>
        `<span class="chip">★ ${lockerName(id)} <button onclick="toggleFavorite('${id}', event)">✕</button></span>`).join("")
    : `<span class="muted">${t("noFavorites")}</span>`;
}

// ---------- Mikor kell értesíteni? (minden renderAll után lefut) ----------

let knownAvailable = null;              // az eddig ismert elérhető ételek azonosítói
const remindedReservations = new Set(); // ezekről már szóltunk

function checkNotifications() {
  const available = donations.filter((d) => d.status === "available");

  // 1) Új étel egy kedvenc automatában
  if (knownAvailable === null) {
    knownAvailable = new Set(available.map((d) => d.id)); // első futás: csak megjegyezzük, nem értesítünk
  } else {
    if (profile.notifications) {
      available
        .filter((d) => !knownAvailable.has(d.id) && isFavorite(d.lockerId) && !profile.donated.includes(d.id))
        .forEach((d) => notify(
          t("notifNewTitle", { locker: lockerName(d.lockerId) }),
          `${CATEGORIES[d.category].icon} ${escapeHtml(titleOf(d))} – ${t("portions", { n: d.portions })}`
        ));
    }
    knownAvailable = new Set(available.map((d) => d.id));
  }

  // 2) Hamarosan lejáró foglalás (ezt mindig jelezzük, mert fontos)
  donations
    .filter((d) => d.status === "reserved" && profile.reserved.includes(d.id))
    .forEach((d) => {
      const minutesLeft = (d.reservedUntil - now()) / 60000;
      if (minutesLeft <= REMIND_BEFORE_MIN && !remindedReservations.has(d.id)) {
        remindedReservations.add(d.id);
        notify(t("notifExpiringTitle"), t("notifExpiringBody", { title: escapeHtml(titleOf(d)), left: timeLeft(d.reservedUntil) }));
      }
    });
}
