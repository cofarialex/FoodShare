// =====================================================
//  Profilom + hatásom
//  Bejelentkezés nincs: a profil ebben a böngészőben tárolódik.
//  Megjegyezzük, melyik adományt te adtad fel és melyiket te vetted át.
// =====================================================

const PROFILE_KEY = "foodshare_profile";

// Becslések a hatás kiszámításához
const KG_PER_PORTION = 0.4;   // 1 adag étel ≈ 0,4 kg
const CO2_PER_KG = 2.5;       // 1 kg kidobott étel ≈ 2,5 kg CO₂ (termelés, szállítás, lebomlás)
const CO2_PER_CAR_KM = 0.12;  // egy átlagos autó ≈ 0,12 kg CO₂ / km

function loadProfile() {
  const saved = localStorage.getItem(PROFILE_KEY);
  const empty = { name: "", donated: [], reserved: [], collected: [], favorites: [], notifications: false };
  // A "...empty" miatt a később hozzáadott mezők (pl. favorites) a régi profilban is meglesznek
  return saved ? { ...empty, ...JSON.parse(saved) } : empty;
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

let profile = loadProfile();

// Ezeket hívja a script.js a megfelelő pillanatban
function rememberDonated(id) {
  profile.donated.push(id);
  saveProfile();
}

function rememberReserved(id) {
  if (!profile.reserved.includes(id)) profile.reserved.push(id);
  saveProfile();
}

function rememberCollected(id) {
  // Csak akkor számít a te átvételednek, ha te foglaltad le (ebben a böngészőben)
  if (profile.reserved.includes(id) && !profile.collected.includes(id)) {
    profile.collected.push(id);
    saveProfile();
  }
}

// ---------- Számítások ----------

function myStats() {
  const myDonations = donations.filter((d) => profile.donated.includes(d.id));
  const myPickups = donations.filter((d) => profile.collected.includes(d.id));

  // Ami tényleg megmenekült: az adományaimból amit átvettek + amit én vettem át
  const rescuedFromMine = myDonations.filter((d) => d.status === "collected");
  const portions = [...rescuedFromMine, ...myPickups.filter((d) => !profile.donated.includes(d.id))]
    .reduce((sum, d) => sum + d.portions, 0);

  const kg = portions * KG_PER_PORTION;
  const co2 = kg * CO2_PER_KG;
  const categories = new Set(myDonations.map((d) => d.category));

  // Megspórolt pénz: a kedvezményes ételeknél az eredeti ár és a fizetett ár különbsége
  const moneySaved = myPickups.filter((d) => d.price > 0).reduce((sum, d) => sum + (d.originalPrice - d.price), 0);
  // Amit az eladásaimból kaptam (a 15% jutalék nélkül)
  const earned = myDonations.filter((d) => d.paid && d.price > 0).reduce((sum, d) => sum + d.price * (1 - COMMISSION), 0);

  return { myDonations, myPickups, portions, kg, co2, carKm: co2 / CO2_PER_CAR_KM, categories: categories.size, moneySaved, earned };
}

// Kitűzők: mindegyiknél megadjuk, mennyinél van meg, és mennyi az aktuális érték
function badges(s) {
  return [
    { id: "firstDonation", icon: "🎁", value: s.myDonations.length, goal: 1 },
    { id: "firstPickup",   icon: "🥡", value: s.myPickups.length,   goal: 1 },
    { id: "fiveDonations", icon: "🏅", value: s.myDonations.length, goal: 5 },
    { id: "explorer",      icon: "🧭", value: s.categories,         goal: 3 },
    { id: "portions50",    icon: "🌟", value: s.portions,           goal: 50 },
    { id: "climate",       icon: "🌍", value: Math.round(s.co2),    goal: 10 },
  ];
}

function formatNumber(n, digits = 1) {
  return n.toLocaleString(t("locale"), { maximumFractionDigits: digits });
}

// ---------- Megjelenítés ----------

function renderProfile() {
  const s = myStats();

  document.getElementById("impact").innerHTML = `
    <div class="impact-tile"><span>🎁</span><strong>${s.myDonations.length}</strong><small>${t("myDonations")}</small></div>
    <div class="impact-tile"><span>🥡</span><strong>${s.myPickups.length}</strong><small>${t("myPickups")}</small></div>
    <div class="impact-tile green"><span>🍽️</span><strong>${formatNumber(s.kg)} kg</strong><small>${t("foodSavedKg")}</small></div>
    <div class="impact-tile green"><span>🌍</span><strong>${formatNumber(s.co2)} kg</strong>
      <small>${t("co2Saved")}<br>${t("carKm", { km: formatNumber(s.carKm, 0) })}</small></div>
    ${s.moneySaved > 0 ? `<div class="impact-tile"><span>💰</span><strong>${formatLei(s.moneySaved)}</strong><small>${t("moneySaved")}</small></div>` : ""}
    ${s.earned > 0 ? `<div class="impact-tile"><span>🏷️</span><strong>${formatLei(s.earned)}</strong><small>${t("moneyEarned")}</small></div>` : ""}
  `;

  document.getElementById("badges").innerHTML = badges(s).map((b) => {
    const done = b.value >= b.goal;
    const progress = Math.min(100, Math.round((b.value / b.goal) * 100));
    return `
      <div class="badge ${done ? "done" : ""}">
        <div class="badge-icon">${b.icon}</div>
        <strong>${t("badge_" + b.id)}</strong>
        <small>${t("badgeDesc_" + b.id)}</small>
        ${done ? `<span class="badge-ok">✓</span>`
               : `<div class="badge-bar"><div style="width:${progress}%"></div></div><small>${Math.min(b.value, b.goal)}/${b.goal}</small>`}
      </div>`;
  }).join("");

  const row = (d) => `
    <li>
      <span>${CATEGORIES[d.category].icon} ${escapeHtml(titleOf(d))}</span>
      <span class="pill-small status-${d.status}">${t("st_" + d.status)}</span>
    </li>`;
  // Az átvételeknél: értékelés gomb, vagy a már megadott csillagok
  const pickupRow = (d) => `
    <li>
      <span>${CATEGORIES[d.category].icon} ${escapeHtml(titleOf(d))}</span>
      ${d.rating
        ? `<button class="link-button stars-small" onclick="openRating(${d.id})">${starsText(d.rating.stars)}</button>`
        : `<button class="btn btn-primary btn-small" onclick="openRating(${d.id})">⭐ ${t("rateButton")}</button>`}
    </li>`;
  const sortNewest = (a, b) => (b.createdAt || b.id) - (a.createdAt || a.id);

  document.getElementById("historyDonations").innerHTML = s.myDonations.length
    ? s.myDonations.sort(sortNewest).map(row).join("")
    : `<li class="muted">${t("noActivity")}</li>`;
  document.getElementById("historyPickups").innerHTML = s.myPickups.length
    ? s.myPickups.sort(sortNewest).map(pickupRow).join("")
    : `<li class="muted">${t("noActivity")}</li>`;

  document.getElementById("nickname").value = profile.name;
  renderNotificationSettings();
}

document.getElementById("nicknameForm").addEventListener("submit", (event) => {
  event.preventDefault();
  profile.name = document.getElementById("nickname").value.trim();
  saveProfile();
  if (profile.name) document.getElementById("donor").value = profile.name; // az űrlapon is kitöltjük
  const msg = document.getElementById("nicknameMessage");
  msg.textContent = "✓";
  setTimeout(() => (msg.textContent = ""), 2000);
});
