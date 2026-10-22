// =====================================================
//  Legközelebbi automata – helymeghatározás
//  A böngésző megkérdezi, hogy megosztod-e a helyedet (navigator.geolocation).
// =====================================================

let userPos = null;      // { lat, lon } – ha a felhasználó megosztotta a helyét
let userMarker = null;   // a "Itt vagy" pötty a térképen

// Két pont távolsága méterben (Haversine-képlet – a Föld görbületét is figyelembe veszi)
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // a Föld sugara méterben
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function distanceTo(locker) {
  return userPos ? distanceMeters(userPos.lat, userPos.lon, locker.lat, locker.lon) : null;
}

// 650 -> "650 m", 1234 -> "1,2 km"
function formatDistance(m) {
  if (m < 1000) return Math.round(m / 10) * 10 + " m";
  return (m / 1000).toLocaleString(t("locale"), { maximumFractionDigits: 1 }) + " km";
}

// Gyalogos idő: kb. 5 km/h = 83 méter percenként
function walkMinutes(m) {
  return Math.max(1, Math.round(m / 83));
}

// Google Maps útvonaltervező link (gyalog)
function routeLink(locker) {
  let url = `https://www.google.com/maps/dir/?api=1&destination=${locker.lat},${locker.lon}&travelmode=walking`;
  if (userPos) url += `&origin=${userPos.lat},${userPos.lon}`;
  return url;
}

// A legközelebbi MŰKÖDŐ automata (a zároltakat kihagyjuk)
function nearestLocker() {
  if (!userPos) return null;
  return lockers
    .filter((l) => !isLockerBroken(l))
    .sort((a, b) => distanceTo(a) - distanceTo(b))[0] || null;
}

function setLocationMessage(text) {
  document.getElementById("locationMessage").innerHTML = text;
}

function useLocation(lat, lon, moveMap = true) {
  userPos = { lat, lon };

  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat, lon], {
    radius: 9, color: "white", weight: 3, fillColor: "#2980b9", fillOpacity: 1,
  }).addTo(map).bindPopup(t("youAreHere"));

  const nearest = nearestLocker();
  if (nearest) {
    const d = distanceTo(nearest);
    setLocationMessage(t("nearestResult", { name: lockerName(nearest.id), dist: formatDistance(d), min: walkMinutes(d) }) +
      ` <a href="${routeLink(nearest)}" target="_blank">${t("route")}</a>`);
    // A térkép mutassa a felhasználót ÉS a legközelebbi automatát is
    if (moveMap) map.fitBounds([[lat, lon], [nearest.lat, nearest.lon]], { padding: [60, 60], maxZoom: 16 });
  }
  renderAll();
}

function findNearest() {
  if (!navigator.geolocation) {
    setLocationMessage(t("locUnavailable"));
    return;
  }
  setLocationMessage(t("locating"));
  navigator.geolocation.getCurrentPosition(
    (pos) => useLocation(pos.coords.latitude, pos.coords.longitude),
    (err) => setLocationMessage(err.code === 1 ? t("locDenied") : t("locUnavailable")),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Bemutatóhoz: úgy teszünk, mintha a város közepén (Színház tér) állnánk
function demoLocation() {
  useLocation(46.54612, 24.56090); // Színház tér (OpenStreetMap)
}
