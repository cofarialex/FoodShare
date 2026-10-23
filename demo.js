// =====================================================
//  Bemutató mód
//  Lépésről lépésre végigvezeti a nézőt a teljes folyamaton, és a gombnyomásokat
//  is ELVÉGZI helyette (űrlap kitöltése, kód beírása, foglalás, átvétel, értékelés).
//  Minden lépésnek van: célpontja (amit kiemelünk), szövege és egy művelete.
// =====================================================

const demo = { step: -1, donationId: null, busy: false };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kód "begépelése" a szimulátorba, számjegyenként, hogy látszódjon
async function demoTypeCode(code) {
  pressKey("C");
  for (const digit of code) {
    await sleep(250);
    pressKey(digit);
  }
  await sleep(400);
  pressKey("OK");
}

function demoScroll(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function demoHighlight(selector) {
  document.querySelectorAll(".demo-highlight").forEach((el) => el.classList.remove("demo-highlight"));
  const el = selector && document.querySelector(selector);
  if (el) el.classList.add("demo-highlight");
}

function demoDonation() {
  return donations.find((d) => d.id === demo.donationId);
}

// Az a működő automata, ahol van szabad rekesz (a legközelebbit választjuk)
function demoLocker() {
  const ok = lockers.filter((l) => !isLockerBroken(l) && freeSlots(l).length > 0);
  if (userPos) ok.sort((a, b) => distanceTo(a) - distanceTo(b));
  return ok[0];
}

const DEMO_STEPS = [
  { // 1. Bevezető
    target: ".hero",
    run: async () => { closeModal(); window.scrollTo({ top: 0, behavior: "smooth" }); },
  },
  { // 2. Térkép + legközelebbi automata
    target: "#terkep .map-layout",
    run: async () => { demoScroll("#terkep"); demoLocation(); },
  },
  { // 3. Űrlap kitöltése
    target: "#donationForm",
    run: async () => {
      demoScroll("#donationForm");
      const locker = demoLocker();
      if (!locker) throw new Error(t("demoNoLocker"));
      document.getElementById("title").value = t("demoFoodName");
      document.getElementById("category").value = "cooked";
      updateCategoryInfo();
      document.getElementById("portions").value = 4;
      document.getElementById("locker").value = locker.id;
      document.getElementById("donor").value = profile.name || "Napfény Bisztró";
      document.querySelectorAll("#dietInputs input").forEach((c) => (c.checked = c.value === "vegetarian"));
      document.querySelector('input[name="offerType"][value="free"]').checked = true;
      updatePricePreview();
    },
  },
  { // 4. Beküldés -> betöltő kód
    target: "#modal .modal-box",
    run: async () => {
      lastSubmittedId = null;
      document.getElementById("donationForm").requestSubmit();
      await sleep(300);
      // Nem a lista első elemét vesszük (felhőből más sorrendben jöhet), hanem pont azt, amit most küldtünk be
      if (!lastSubmittedId) throw new Error(document.getElementById("formMessage").textContent || t("demoNoLocker"));
      demo.donationId = lastSubmittedId;
    },
  },
  { // 5. Betöltés az automatánál
    target: ".machine",
    run: async () => {
      closeModal();
      const d = demoDonation();
      if (!d) throw new Error(t("demoNoLocker"));
      demoScroll("#automata");
      document.getElementById("machineSelect").value = d.lockerId;
      document.getElementById("machineSelect").dispatchEvent(new Event("change"));
      await sleep(700);
      await demoTypeCode(d.dropCode);
    },
  },
  { // 6. Foglalás (egy másik felhasználó szemszögéből)
    target: "#donationList",
    run: async () => {
      document.getElementById("onlyAvailable").checked = true;
      renderDonations();
      demoScroll("#adomanyok");
      await sleep(600);
      reserve(demo.donationId);
    },
  },
  { // 7. Átvétel a kóddal
    target: ".machine",
    run: async () => {
      closeModal();
      demoScroll("#automata");
      await sleep(700);
      await demoTypeCode(demoDonation().pickupCode);
    },
  },
  { // 8. Értékelés
    target: "#ratingModal .modal-box",
    run: async () => {
      await sleep(3300); // az ajtó becsukódik, felugrik az értékelés
      if (document.getElementById("ratingModal").classList.contains("hidden")) openRating(demo.donationId);
      for (let i = 1; i <= 5; i++) { setStars(i); await sleep(150); }
      document.getElementById("ratingComment").value = t("demoComment");
    },
  },
  { // 9. Profil + hatás
    target: "#impact",
    run: async () => {
      if (!document.getElementById("ratingModal").classList.contains("hidden")) submitRating();
      demoScroll("#profil");
    },
  },
  { // 10. Cégeknek
    target: ".biz-banner",
    run: async () => demoScroll(".biz-banner"),
  },
];

function renderDemoPanel() {
  const panel = document.getElementById("demoPanel");
  const n = demo.step + 1;
  const last = demo.step === DEMO_STEPS.length - 1;
  panel.innerHTML = `
    <div class="demo-progress"><div style="width:${(n / DEMO_STEPS.length) * 100}%"></div></div>
    <div class="demo-head"><b>▶️ ${t("demoTitle")}</b><span>${n} / ${DEMO_STEPS.length}</span></div>
    <h4>${t("demoS" + n + "Title")}</h4>
    <p>${t("demoS" + n + "Text")}</p>
    <div class="demo-buttons">
      <button class="btn btn-secondary btn-small" onclick="stopDemo()">${t("demoExit")}</button>
      <button class="btn btn-primary btn-small" id="demoNext" onclick="${last ? "stopDemo()" : "nextDemoStep()"}" ${demo.busy ? "disabled" : ""}>
        ${demo.busy ? "⏳" : last ? t("demoFinish") : t("demoNext")}
      </button>
    </div>`;
}

async function goToDemoStep(i) {
  demo.step = i;
  demo.busy = true;
  renderDemoPanel();
  try {
    await DEMO_STEPS[i].run();
  } catch (e) {
    showToast("⚠️ " + e.message);
    stopDemo();
    return;
  }
  demoHighlight(DEMO_STEPS[i].target);
  demo.busy = false;
  renderDemoPanel();
}

function nextDemoStep() {
  if (demo.busy) return;
  goToDemoStep(demo.step + 1);
}

function startDemo() {
  document.getElementById("demoPanel").classList.remove("hidden");
  goToDemoStep(0);
}

function stopDemo() {
  demo.step = -1;
  demo.busy = false;
  demoHighlight(null);
  document.getElementById("demoPanel").classList.add("hidden");
}
