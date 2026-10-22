// =====================================================
//  Firebase beállítások
//  Ha FIREBASE_CONFIG = null, az app "helyi módban" fut: minden adat csak a saját böngésződben van.
//  Ha kitöltöd, az adatok a Firebase felhőben lesznek, és MINDEN eszközön ugyanazt látod.
//
//  A firebaseConfig-ot a Firebase konzolban találod:
//  Project settings (fogaskerék) -> General -> Your apps -> SDK setup and configuration -> Config
//  (Ez nem titkos jelszó – a weboldal kódjában amúgy is mindenki láthatja.)
// =====================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCZU6USX05z9KuDpd1_1A1wNWtI6QC4cRE",
  authDomain: "foodshare-ef79f.firebaseapp.com",
  projectId: "foodshare-ef79f",
  storageBucket: "foodshare-ef79f.firebasestorage.app",
  messagingSenderId: "793031376814",
  appId: "1:793031376814:web:32b21b5c6681e04501523f",
};

/* Példa, hogyan néz ki kitöltve:
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "foodshare-12345.firebaseapp.com",
  projectId: "foodshare-12345",
  storageBucket: "foodshare-12345.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123",
};
*/
