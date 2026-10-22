// =====================================================
//  Értékelés + hibabejelentés
//  Átvétel után 1–5 csillag, és jelezni lehet, ha gond volt.
//  Az adat az adományhoz mentődik (d.rating), az admin a "Visszajelzések" fülön látja.
// =====================================================

const PROBLEMS = ["spoiled", "wrong", "missing", "dirty", "other"];

let ratingFor = null;   // melyik adományt értékeljük
let ratingStars = 0;

function openRating(id) {
  const d = donations.find((x) => x.id === id);
  if (!d) return;
  ratingFor = id;
  ratingStars = d.rating ? d.rating.stars : 0;

  document.getElementById("ratingFood").textContent = `${CATEGORIES[d.category].icon} ${titleOf(d)} – ${d.donor}`;
  document.getElementById("ratingProblems").innerHTML = PROBLEMS.map((p) => `
    <label class="problem">
      <input type="checkbox" value="${p}" ${d.rating && d.rating.problems.includes(p) ? "checked" : ""}>
      ${t("problem_" + p)}
    </label>`).join("");
  document.getElementById("ratingComment").value = d.rating ? d.rating.comment : "";
  document.getElementById("ratingMessage").textContent = "";
  renderStars();
  document.getElementById("ratingModal").classList.remove("hidden");
}

function closeRating() {
  ratingFor = null;
  document.getElementById("ratingModal").classList.add("hidden");
}

function setStars(n) {
  ratingStars = n;
  renderStars();
}

function renderStars() {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<button type="button" class="star ${i <= ratingStars ? "on" : ""}" onclick="setStars(${i})">★</button>`;
  }
  document.getElementById("ratingStars").innerHTML = html;
}

function submitRating() {
  if (ratingStars === 0) {
    document.getElementById("ratingMessage").textContent = t("ratingPickStars");
    return;
  }
  const problems = [...document.querySelectorAll("#ratingProblems input:checked")].map((c) => c.value);
  const d = donations.find((x) => x.id === ratingFor);
  d.rating = {
    stars: ratingStars,
    problems: problems,
    comment: document.getElementById("ratingComment").value.trim(),
    at: now(),
    resolved: problems.length === 0, // ha nincs probléma, nincs mit megoldani
  };
  saveDonations();
  closeRating();
  showToast(problems.length ? t("ratingThanksProblem") : t("ratingThanks"));
  renderAll();
}

// Egy adományozó átlagos értékelése (pl. "⭐ 4,5 (3)")
function donorRating(donor) {
  const rated = donations.filter((d) => d.donor === donor && d.rating);
  if (rated.length === 0) return "";
  const avg = rated.reduce((sum, d) => sum + d.rating.stars, 0) / rated.length;
  return ` · <span class="donor-rating" title="${t("donorRatingTitle")}">⭐ ${avg.toLocaleString(t("locale"), { maximumFractionDigits: 1 })} (${rated.length})</span>`;
}

function starsText(n) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

document.getElementById("ratingModal").addEventListener("click", (e) => {
  if (e.target.id === "ratingModal") closeRating();
});
