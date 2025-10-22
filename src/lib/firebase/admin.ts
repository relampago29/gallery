// src/lib/firebase/admin.ts
import { getApps, initializeApp, cert, AppOptions, App, getApp } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;

function ensureApp(): App {
  if (_app) return _app;

  // Accept either plain PEM with \n escapes or BASE64-encoded
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || null;
  const privateKeyB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || null;
  if (!privateKey && privateKeyB64) {
    try {
      privateKey = Buffer.from(privateKeyB64, "base64").toString("utf8");
    } catch {
      // ignore decode errors; will fail on validation below
    }
  }
  if (privateKey) {
    privateKey = privateKey
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n");
  }
  const projectId = process.env.FIREBASE_PROJECT_ID || undefined;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || undefined;
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : undefined);

  if (projectId && clientEmail && privateKey) {
    const options: AppOptions = {
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: bucket,
    };
    _app = getApps().length ? getApp() : initializeApp(options);
  } else {
    // Tenta Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)
    _app = getApps().length ? getApp() : initializeApp();
  }
  return _app;
}

export function getAdminAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(ensureApp());
  return _auth;
}

export function getAdminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(ensureApp());
  return _db;
}

export function getAdminStorage(): Storage {
  if (_storage) return _storage;
  _storage = getStorage(ensureApp());
  return _storage;
}
