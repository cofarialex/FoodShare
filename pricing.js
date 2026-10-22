// =====================================================
//  Kedvezményes eladás
//  Az adományozó választhat: ingyenes adomány VAGY kedvezményes eladás (pl. -60%).
//  A fizetés csak SZIMULÁLT (bemutató) – valódi kártyaadatot nem kérünk és nem kezelünk.
//  A FoodShare jutaléka minden eladásból 15% (ezt az admin statisztika mutatja).
// =====================================================

const COMMISSION = 0.15;
const DISCOUNTS = [30, 50, 60, 70, 80]; // választható kedvezmények (%)

function formatLei(value) {
  return value.toLocaleString(t("locale"), { maximumFractionDigits: 2 }) + " lei";
}

// Árcímke a kártyára
function priceTag(d) {
  if (!d.price) return `<span class="price-tag free">${t("priceFree")}</span>`;
  const percent = Math.round((1 - d.price / d.originalPrice) * 100);
  return `<span class="price-tag">−${percent}% · <b>${formatLei(d.price)}</b> <s>${formatLei(d.originalPrice)}</s></span>`;
}

// Szűrés ár szerint: "all" / "free" / "sale"
function matchesPriceFilter(d) {
  const value = document.getElementById("priceFilter").value;
  if (value === "free") return !d.price;
  if (value === "sale") return d.price > 0;
  return true;
}

// ---------- Űrlap ----------

function fillPriceForm() {
  document.getElementById("discount").innerHTML = DISCOUNTS.map((p) => `<option value="${p}">−${p}%</option>`).join("");
  document.getElementById("discount").value = "60";
  document.getElementById("priceFilter").innerHTML = `
    <option value="all">${t("priceAll")}</option>
    <option value="free">${t("priceOnlyFree")}</option>
    <option value="sale">${t("priceOnlySale")}</option>`;
  updatePricePreview();
}

function isSale() {
  return document.querySelector('input[name="offerType"]:checked').value === "sale";
}

function updatePricePreview() {
  const sale = isSale();
  document.getElementById("saleFields").classList.toggle("hidden", !sale);
  document.getElementById("originalPrice").required = sale;
  const original = Number(document.getElementById("originalPrice").value);
  const discount = Number(document.getElementById("discount").value);
  document.getElementById("pricePreview").textContent = sale && original > 0
    ? t("pricePreview", { price: formatLei(salePrice(original, discount)), you: formatLei(salePrice(original, discount) * (1 - COMMISSION)) })
    : "";
}

// Kedvezményes ár, 0,5 lejre kerekítve
function salePrice(original, discount) {
  return Math.round(original * (1 - discount / 100) * 2) / 2;
}

// Az űrlapból: { price, originalPrice } (ingyenesnél price = 0)
function readPriceFromForm() {
  if (!isSale()) return { price: 0, originalPrice: 0 };
  const original = Number(document.getElementById("originalPrice").value);
  return { price: salePrice(original, Number(document.getElementById("discount").value)), originalPrice: original };
}

document.querySelectorAll('input[name="offerType"]').forEach((r) => r.addEventListener("change", updatePricePreview));
document.getElementById("originalPrice").addEventListener("input", updatePricePreview);
document.getElementById("discount").addEventListener("change", updatePricePreview);

// ---------- Szimulált fizetés ----------

let payingFor = null;

function openPayment(id) {
  const d = donations.find((x) => x.id === id);
  payingFor = id;
  document.getElementById("payItem").textContent = `${CATEGORIES[d.category].icon} ${titleOf(d)} – ${d.donor}`;
  document.getElementById("payAmount").innerHTML = `${formatLei(d.price)} <s>${formatLei(d.originalPrice)}</s>`;
  document.getElementById("payModal").classList.remove("hidden");
}

function closePayment() {
  payingFor = null;
  document.getElementById("payModal").classList.add("hidden");
}

function confirmPayment() {
  const d = donations.find((x) => x.id === payingFor);
  if (!d || d.status !== "available") { closePayment(); return; }
  d.paid = true;
  d.paidAt = now();
  saveDonations();
  const id = payingFor;
  closePayment();
  showToast(t("paySuccess", { amount: formatLei(d.price) }));
  reserve(id); // fizetés után jön a foglalás és a kód
}

document.getElementById("payModal").addEventListener("click", (e) => {
  if (e.target.id === "payModal") closePayment();
});
