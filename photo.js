// =====================================================
//  Fotó az ételről
//  A képet a böngészőben lekicsinyítjük (max. 800 px), és szövegként (data URL) mentjük el.
//  Erre azért van szükség, mert a localStorage-ba csak kb. 5 MB fér, egy telefonos fotó pedig 3-5 MB is lehet.
// =====================================================

const PHOTO_MAX_SIZE = 800;   // a hosszabbik oldal legfeljebb ennyi pixel
const PHOTO_QUALITY = 0.7;    // JPEG minőség (0–1): kisebb szám = kisebb fájl

let pendingPhoto = null;      // a kiválasztott (már lekicsinyített) kép, amíg el nem küldöd az űrlapot

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Arányos kicsinyítés
        const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showPhotoPreview() {
  const box = document.getElementById("photoPreview");
  if (pendingPhoto) {
    box.innerHTML = `<img src="${pendingPhoto}" alt="">
      <button type="button" class="btn btn-danger btn-small" onclick="clearPhoto()">${t("removePhoto")}</button>`;
    box.classList.remove("hidden");
  } else {
    box.innerHTML = "";
    box.classList.add("hidden");
  }
}

function clearPhoto() {
  pendingPhoto = null;
  document.getElementById("photo").value = "";
  showPhotoPreview();
}

document.getElementById("photo").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    pendingPhoto = await resizeImage(file);
  } catch (e) {
    pendingPhoto = null;
    alert(t("photoError"));
  }
  showPhotoPreview();
});

// A kártya teteje: fotó, vagy ha nincs, egy színes kép a kategória ikonjával
function photoHtml(d) {
  if (d.photo) return `<img class="card-photo" src="${d.photo}" alt="">`;
  return `<div class="card-photo placeholder cat-${d.category}">${CATEGORIES[d.category].icon}</div>`;
}
