// =====================================================
//  "Cégeknek" oldal
//  - nyelvváltás (ugyanazt a nyelvet használja, mint a főoldal)
//  - önellenőrző teszt
//  - jelentkezési űrlap -> localStorage-ba mentjük, az admin "Érdeklődők" fülén látszik
// =====================================================

const LEADS_KEY = "foodshare_leads";
const CHECK_ITEMS = ["bC1", "bC2", "bC3", "bC4", "bC5", "bC6"];
const BUSINESS_TYPES = ["producer", "distributor", "retail", "bakery", "horeca", "other"];
const PLANS = ["unsure", "basic", "pro", "chain"];

let currentLang = localStorage.getItem("foodshare_lang") || "hu";
let checked = new Set(); // a bejelölt önellenőrző pontok

function t(key, values = {}) {
  let text = TRANSLATIONS[currentLang][key];
  if (text === undefined) return key;
  for (const name in values) text = text.replace("{" + name + "}", values[name]);
  return text;
}

// ---------- Nyelv ----------

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.title = "FoodShare – " + t("navBusiness");
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll(".lang-switch button").forEach((b) => b.classList.toggle("active", b.dataset.lang === currentLang));
  fillFormSelects();
  renderCheck();
}

document.querySelectorAll(".lang-switch button").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem("foodshare_lang", currentLang);
    applyLanguage();
initCloud(); // felhő (ha be van állítva)
  });
});

// ---------- Önellenőrzés ----------

function renderCheck() {
  document.getElementById("checkList").innerHTML = CHECK_ITEMS.map((key) => `
    <label class="check-item ${checked.has(key) ? "on" : ""}">
      <input type="checkbox" ${checked.has(key) ? "checked" : ""} onchange="toggleCheck('${key}')">
      <span>${t(key)}</span>
    </label>`).join("");

  const n = checked.size;
  const level = n === 6 ? "good" : n >= 3 ? "mid" : "bad";
  const message = { good: t("bCheckGood"), mid: t("bCheckMid"), bad: t("bCheckBad") }[level];
  document.getElementById("checkResult").innerHTML = `
    <div class="score score-${level}">
      <div class="score-ring" style="--p:${Math.round((n / 6) * 100)}"><span>${t("bCheckScore", { n })}</span></div>
      <p>${message}</p>
      ${level !== "good" ? `<a href="#kapcsolat" class="btn btn-primary" onclick="choosePlan('pro')">${t("bCheckCta")}</a>` : ""}
    </div>`;
}

function toggleCheck(key) {
  if (checked.has(key)) checked.delete(key);
  else checked.add(key);
  renderCheck();
}

// ---------- Űrlap ----------

function fillFormSelects() {
  const type = document.getElementById("lType");
  const plan = document.getElementById("lPlan");
  const keepType = type.value;
  const keepPlan = plan.value;
  type.innerHTML = BUSINESS_TYPES.map((k) => `<option value="${k}">${t("bType_" + k)}</option>`).join("");
  plan.innerHTML = PLANS.map((k) => `<option value="${k}">${t("bPlan_" + k)}</option>`).join("");
  if (keepType) type.value = keepType;
  if (keepPlan) plan.value = keepPlan;
}

// Az "Ezt választom" gomb előre kiválasztja a csomagot az űrlapon
function choosePlan(plan) {
  document.getElementById("lPlan").value = plan;
}

document.getElementById("leadForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const lead = {
    id: Date.now(),
    createdAt: Date.now(),
    company: document.getElementById("lCompany").value.trim(),
    type: document.getElementById("lType").value,
    city: document.getElementById("lCity").value.trim(),
    plan: document.getElementById("lPlan").value,
    name: document.getElementById("lName").value.trim(),
    email: document.getElementById("lEmail").value.trim(),
    phone: document.getElementById("lPhone").value.trim(),
    message: document.getElementById("lMessage").value.trim(),
    checkScore: checked.size, // az önellenőrzés eredménye is jól jön az értékesítésnél
    lang: currentLang,
    status: "new",
  };
  const leads = JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");
  leads.unshift(lead);
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  if (CLOUD.enabled) cloudAddLead(lead).catch((e) => console.warn("[FoodShare] Lead mentés hiba:", e.message));

  event.target.reset();
  document.getElementById("lCity").value = "Târgu Mureș";
  const msg = document.getElementById("leadMessage");
  msg.textContent = t("bFThanks");
  setTimeout(() => (msg.textContent = ""), 5000);
});

applyLanguage();
initCloud(); // felhő (ha be van állítva)
