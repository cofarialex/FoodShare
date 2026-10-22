// =====================================================
//  Éves jelentés (admin)
//  Egy adományozóra (cégre) és egy évre összesíti az ételátadásokat,
//  hogy a cég fel tudja használni a minisztériumi (MADR) éves jelentéséhez.
//  FIGYELEM: ez tájékoztató összesítő, NEM hivatalos formanyomtatvány.
// =====================================================

const MEASURES = [
  { id: "prevent", name: "Felesleg megelőzése, belső felelős kijelölése" },
  { id: "discount", name: "Kedvezményes eladás a lejárat előtt" },
  { id: "donate", name: "Étel átadása emberi fogyasztásra (adomány)" },
  { id: "other", name: "Egyéb hasznosítás (feldolgozás, takarmány, komposzt)" },
];

function reportYearOf(d) {
  return new Date(d.createdAt || d.id).getFullYear();
}

function fillReportSelects() {
  const donorSel = document.getElementById("reportDonor");
  const yearSel = document.getElementById("reportYear");
  const keepDonor = donorSel.value;
  const keepYear = yearSel.value;

  const donors = [...new Set(donations.map((d) => d.donor))].sort((a, b) => a.localeCompare(b, "hu"));
  donorSel.innerHTML = `<option value="__all">Összes adományozó (FoodShare összesítő)</option>` +
    donors.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");

  const years = [...new Set(donations.map(reportYearOf))];
  if (!years.includes(new Date().getFullYear())) years.push(new Date().getFullYear());
  yearSel.innerHTML = years.sort((a, b) => b - a).map((y) => `<option>${y}</option>`).join("");

  if (keepDonor && [...donorSel.options].some((o) => o.value === keepDonor)) donorSel.value = keepDonor;
  if (keepYear) yearSel.value = keepYear;
}

function renderReport() {
  fillReportSelects();
  const donor = document.getElementById("reportDonor").value;
  const year = Number(document.getElementById("reportYear").value);
  const prevention = document.getElementById("reportPrevention").checked;
  const otherUse = document.getElementById("reportOther").checked;

  // Csak a ténylegesen betöltött tételek számítanak (a "betöltésre vár" még nem átadás)
  const list = donations
    .filter((d) => d.status !== "waiting")
    .filter((d) => donor === "__all" || d.donor === donor)
    .filter((d) => reportYearOf(d) === year)
    .sort((a, b) => (a.createdAt || a.id) - (b.createdAt || b.id));

  const sum = (arr) => arr.reduce((s, d) => s + d.portions, 0);
  const free = list.filter((d) => !d.price);
  const sales = list.filter((d) => d.price > 0);
  const collected = list.filter((d) => d.status === "collected");
  const wasted = list.filter((d) => d.status === "expired" || d.status === "cleared");
  const revenue = sales.filter((d) => d.paid).reduce((s, d) => s + d.price, 0);
  const kg = (portions) => (portions * 0.4).toLocaleString("hu-HU", { maximumFractionDigits: 1 });

  // Melyik intézkedést alkalmazták? (a megelőzést és az egyéb hasznosítást az admin jelöli be)
  const applied = {
    prevent: prevention,
    discount: sales.length > 0,
    donate: free.length > 0,
    other: otherUse,
  };
  const appliedCount = Object.values(applied).filter(Boolean).length;

  const byCategory = Object.keys(CATEGORIES).map((id) => {
    const items = list.filter((d) => d.category === id);
    return items.length ? `<tr><td>${CATEGORIES[id].icon} ${hu["cat_" + id]}</td><td>${items.length}</td><td>${sum(items)}</td>
      <td>${kg(sum(items))}</td><td>${sum(items.filter((d) => d.status === "collected"))}</td></tr>` : "";
  }).join("");

  const name = donor === "__all" ? "FoodShare – összesítő (minden adományozó)" : donor;

  document.getElementById("reportSheet").innerHTML = `
    <div class="report-head">
      <img src="logo.svg" alt="">
      <div>
        <h2>Éves összesítő az ételpazarlás megelőzéséről</h2>
        <p>Raport anual privind prevenirea risipei alimentare</p>
      </div>
    </div>

    <table class="report-meta">
      <tr><th>Adományozó / operátor</th><td>${escapeHtml(name)}</td></tr>
      <tr><th>Időszak</th><td>${year}. 01. 01. – ${year}. 12. 31.</td></tr>
      <tr><th>Készült</th><td>${new Date().toLocaleString("hu-HU")}</td></tr>
      <tr><th>Rendszer</th><td>FoodShare – hűtött ételmentő automaták, Marosvásárhely</td></tr>
    </table>

    <h3>1. Összesítés</h3>
    <div class="report-kpis">
      <div><span>Átadott tételek</span><strong>${list.length}</strong></div>
      <div><span>Adag összesen</span><strong>${sum(list)}</strong></div>
      <div><span>Becsült mennyiség</span><strong>${kg(sum(list))} kg</strong></div>
      <div><span>Átvett (megmentett) adag</span><strong>${sum(collected)}</strong></div>
      <div><span>Ingyenes adomány</span><strong>${free.length} tétel / ${sum(free)} adag</strong></div>
      <div><span>Kedvezményes eladás</span><strong>${sales.length} tétel / ${revenue.toLocaleString("hu-HU")} lei</strong></div>
      <div><span>Lejárt, ki nem vett</span><strong>${wasted.length} tétel / ${sum(wasted)} adag</strong></div>
      <div><span>Mentési arány</span><strong>${list.length ? Math.round((sum(collected) / Math.max(1, sum(collected) + sum(wasted))) * 100) : 0}%</strong></div>
    </div>

    <h3>2. Alkalmazott intézkedések (legalább 2 kötelező)</h3>
    <ul class="report-measures">
      ${MEASURES.map((m) => `<li class="${applied[m.id] ? "yes" : "no"}">${applied[m.id] ? "✅" : "⬜"} ${m.name}</li>`).join("")}
    </ul>
    <p class="report-verdict ${appliedCount >= 2 ? "ok" : "bad"}">
      ${appliedCount >= 2 ? `✅ ${appliedCount} intézkedés alkalmazva – a minimum (2) teljesül.` : `⚠️ Csak ${appliedCount} intézkedés – legalább 2 szükséges.`}
    </p>

    <h3>3. Kategóriák szerint</h3>
    <table class="admin-table report-table">
      <tr><th>Kategória</th><th>Tétel</th><th>Adag</th><th>Becsült kg</th><th>Átvett adag</th></tr>
      ${byCategory || `<tr><td colspan="5">Nincs adat ebben az időszakban.</td></tr>`}
    </table>

    <h3>4. Átadási napló (nyomon követhetőség)</h3>
    <table class="admin-table report-table">
      <tr><th>Dátum</th><th>Étel</th><th>Kategória</th><th>Adag</th><th>Automata / rekesz</th><th>Típus</th><th>Állapot</th></tr>
      ${list.map((d) => `<tr>
        <td>${formatDate(d.createdAt || d.id)}</td><td>${escapeHtml(titleOf(d))}</td><td>${hu["cat_" + d.category]}</td>
        <td>${d.portions}</td><td>${escapeHtml(lockerLabel(d.lockerId))} / ${d.slot}.</td>
        <td>${d.price > 0 ? "Kedvezményes eladás" : "Adomány"}</td><td>${hu["st_" + d.status]}</td></tr>`).join("") ||
        `<tr><td colspan="7">Nincs átadás ebben az időszakban.</td></tr>`}
    </table>

    <p class="report-note">Becslés: 1 adag ≈ 0,4 kg. A dokumentumot legalább 3 évig meg kell őrizni.
      Ez egy tájékoztató összesítő, nem hivatalos MADR-formanyomtatvány – a hivatalos jelentést a minisztérium online felületén kell benyújtani.</p>

    <div class="report-sign">
      <div>Dátum: ____________________</div>
      <div>Felelős neve, aláírása: ____________________</div>
    </div>
  `;
}

["reportDonor", "reportYear", "reportPrevention", "reportOther"].forEach((id) =>
  document.getElementById(id).addEventListener("change", renderReport));
