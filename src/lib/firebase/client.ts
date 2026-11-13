// src/lib/firebase/client.ts
import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(config);

export const auth = getAuth(app);
// Sessão apenas por aba (não persiste entre reaberturas do browser)
setPersistence(auth, browserSessionPersistence).catch(() => {
  /* fallback silencioso */
});

// Expira sessão em ~1 minuto para testes (força logout mesmo se o token for renovado)
const TTL_MS = 60 * 1000;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function clearExpiryTimer() {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

function scheduleFixedExpiry() {
  clearExpiryTimer();
  const expireAt = Date.now() + TTL_MS;
  if (typeof window !== "undefined") {
    sessionStorage.setItem("authExpiry", String(expireAt));
  }
  expiryTimer = setTimeout(() => {
    signOut(auth).catch(() => {});
  }, TTL_MS);
}

if (typeof window !== "undefined") {
  const expiry = sessionStorage.getItem("authExpiry");
  if (expiry && Number(expiry) < Date.now()) {
    signOut(auth).catch(() => {});
  }
  onAuthStateChanged(auth, (user) => {
    clearExpiryTimer();
    if (user) {
      scheduleFixedExpiry();
    } else {
      sessionStorage.removeItem("authExpiry");
    }
  });
}
export const db = getFirestore(app);
export const storage = getStorage(app);

// Optional: connect to local Storage emulator for offline/corporate networks
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true") {
  try {
    connectStorageEmulator(storage, "localhost", 9199);
    // console.info("Firebase Storage emulator connected at localhost:9199");
  } catch {}
}
