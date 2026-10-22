// =====================================================
//  Sötét / világos téma
//  Ezt a fájlt a <head>-ben töltjük be, hogy az oldal már eleve a jó színnel jelenjen meg
//  (különben egy pillanatra fehéren villanna).
// =====================================================

const THEME_KEY = "foodshare_theme";

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (e) {
    return null;
  }
}

// Ha még nem választottál, a gép beállítását követjük (macOS: Megjelenés -> Sötét)
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = document.getElementById("themeToggle");
  if (button) button.textContent = theme === "dark" ? "☀️" : "🌙";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#14201a" : "#27ae60";
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {}
  applyTheme(next);
}

applyTheme(savedTheme() || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

// A gomb az oldal betöltése után jelenik meg -> akkor még egyszer beállítjuk a feliratát
document.addEventListener("DOMContentLoaded", () => applyTheme(document.documentElement.dataset.theme));
