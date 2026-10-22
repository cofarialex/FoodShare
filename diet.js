// =====================================================
//  Allergének és diéta
//  Az adományozó feltöltéskor bejelöli, mi igaz az ételre.
//  "nuts" és "eggs" = TARTALMAZ diót / tojást (ezek allergének).
// =====================================================

const DIET_TAGS = {
  vegan:       "🌱",
  vegetarian:  "🥦",
  glutenfree:  "🌾",
  lactosefree: "🥛",
  nuts:        "🥜", // tartalmaz diót / mogyorót
  eggs:        "🥚", // tartalmaz tojást
};

// A szűrő gombjai. A "nutfree" / "eggfree" azt jelenti: NE tartalmazza.
const DIET_FILTERS = ["vegan", "vegetarian", "glutenfree", "lactosefree", "nutfree", "eggfree"];
const FILTER_ICONS = { vegan: "🌱", vegetarian: "🥦", glutenfree: "🌾", lactosefree: "🥛", nutfree: "🚫🥜", eggfree: "🚫🥚" };

let activeDiet = new Set(); // bekapcsolt szűrők

function tagsOf(d) {
  return d.tags || [];
}

function matchesDiet(d) {
  const tags = tagsOf(d);
  for (const f of activeDiet) {
    if (f === "nutfree") { if (tags.includes("nuts")) return false; continue; }
    if (f === "eggfree") { if (tags.includes("eggs")) return false; continue; }
    // a vegán étel egyben vegetáriánus is
    if (f === "vegetarian") { if (!tags.includes("vegetarian") && !tags.includes("vegan")) return false; continue; }
    if (!tags.includes(f)) return false;
  }
  return true;
}

// Kis címkék a kártyán
function dietChips(d) {
  const tags = tagsOf(d);
  if (tags.length === 0) return "";
  return `<div class="diet-chips">${tags.map((tag) =>
    `<span class="diet-chip ${tag === "nuts" || tag === "eggs" ? "allergen" : ""}">${DIET_TAGS[tag]} ${t("diet_" + tag)}</span>`).join("")}</div>`;
}

// ---------- Űrlap: jelölőnégyzetek ----------

function renderDietInputs() {
  const box = document.getElementById("dietInputs");
  const checked = new Set([...box.querySelectorAll("input:checked")].map((c) => c.value));
  box.innerHTML = Object.keys(DIET_TAGS).map((tag) => `
    <label class="diet-option ${tag === "nuts" || tag === "eggs" ? "allergen" : ""}">
      <input type="checkbox" value="${tag}" ${checked.has(tag) ? "checked" : ""}>
      ${DIET_TAGS[tag]} ${t("diet_" + tag)}
    </label>`).join("");
}

function readDietFromForm() {
  return [...document.querySelectorAll("#dietInputs input:checked")].map((c) => c.value);
}

// ---------- Szűrő gombok ----------

function renderDietFilter() {
  document.getElementById("dietFilter").innerHTML = DIET_FILTERS.map((f) => `
    <button type="button" class="diet-filter ${activeDiet.has(f) ? "on" : ""}" onclick="toggleDietFilter('${f}')">
      ${FILTER_ICONS[f]} ${t("dietF_" + f)}
    </button>`).join("");
}

function toggleDietFilter(f) {
  if (activeDiet.has(f)) activeDiet.delete(f);
  else activeDiet.add(f);
  renderDietFilter();
  renderDonations();
}
