// src/lib/firebase/client.ts
import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

/**
 * Safari (and some mobile browsers) block cross-origin requests to
 * identitytoolkit.googleapis.com when the page origin differs from authDomain.
 * Using our custom domain as authDomain in production avoids this.
 * In development (localhost) we keep the Firebase default.
 *
 * @see https://firebase.google.com/docs/auth/web/redirect-best-practices
 */
const isProduction =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  !window.location.hostname.startsWith("127.");

const authDomain = isProduction
  ? (process.env.NEXT_PUBLIC_CUSTOM_AUTH_DOMAIN ??
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!)
  : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!;

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Browser-only: keep auth data in sessionStorage and expire with the tab.
if (typeof window !== "undefined") {
  setPersistence(auth, browserSessionPersistence).catch((err) => {
    console.error("[firebase] failed to set session persistence", err);
  });
}

// Optional: connect to local Storage emulator for offline/corporate networks
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true"
) {
  try {
    connectStorageEmulator(storage, "localhost", 9199);
    // console.info("Firebase Storage emulator connected at localhost:9199");
  } catch {}
}
