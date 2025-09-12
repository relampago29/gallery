// src/lib/firebase/admin.ts
import { getApps, initializeApp, cert, AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
  throw new Error("Faltam variáveis FIREBASE_* para o Admin SDK");
}

const options: AppOptions = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
};

const adminApp = getApps().length ? getApps()[0] : initializeApp(options);

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
