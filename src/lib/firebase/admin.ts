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

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Configuração Admin SDK incompleta. Define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env.local (chave PEM válida).");
  }

  const options: AppOptions = {
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: bucket,
  };
  _app = getApps().length ? getApp() : initializeApp(options);
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
