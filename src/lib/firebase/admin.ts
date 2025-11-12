// src/lib/firebase/admin.ts
// ✅ Apenas no servidor (evita bundling no client)
if (typeof window !== "undefined") {
  throw new Error("firebase/admin.ts só pode ser usado no server.");
}

import { getApps, initializeApp, cert, getApp, type App, type AppOptions } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;
let _dbConfigured = false;

/**
 * Lê PRIVATE KEY de:
 *  - FIREBASE_PRIVATE_KEY (PEM com \n escapado)
 *  - ou FIREBASE_PRIVATE_KEY_BASE64 (JSON da service account ou a própria PEM em base64)
 */
function resolvePrivateKey(): string | null {
  const pk = process.env.FIREBASE_PRIVATE_KEY || null;
  const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || null;

  if (pkB64 && !pk) {
    try {
      // pode ser o JSON inteiro da service account ou apenas a PEM em base64
      const decoded = Buffer.from(pkB64, "base64").toString("utf8");
      try {
        const maybeJson = JSON.parse(decoded);
        if (maybeJson.private_key) {
          return String(maybeJson.private_key);
        }
      } catch {
        // não é JSON; assume PEM pura
      }
      return decoded;
    } catch {
      // se falhar, continua e tentamos pk normal
    }
  }

  if (pk) {
    return pk.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  }
  return null;
}

function resolveBucketName(): string | undefined {
  const projectId = process.env.FIREBASE_PROJECT_ID || undefined;
  const envBucket = process.env.FIREBASE_STORAGE_BUCKET || undefined;
  // Prefer the canonical default bucket derived from projectId
  if (projectId) return `${projectId}.appspot.com`;
  // Fallback to env if it explicitly uses appspot.com
  if (envBucket && envBucket.endsWith('.appspot.com')) return envBucket;
  // Or try converting firebasestorage.app to appspot.com
  if (envBucket && envBucket.endsWith('.firebasestorage.app')) {
    return envBucket.replace(/\.firebasestorage\.app$/i, '.appspot.com');
  }
  return undefined;
}

function ensureApp(): App {
  if (_app) return _app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = resolvePrivateKey();

  // bucket: normaliza para o nome GCS (ex.: <projectId>.appspot.com)
  const storageBucket = resolveBucketName();

  // 1) Service Account explícita (recomendado)
  if (projectId && clientEmail && privateKey) {
    const options: AppOptions = {
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket, // pode ser undefined; o Admin usa o default do projeto
    };
    _app = getApps().length ? getApp() : initializeApp(options);
    return _app;
  }

  // 2) ADC (Application Default Credentials) — gcloud auth application-default login
  _app = getApps().length
    ? getApp()
    : initializeApp(storageBucket ? { storageBucket } : undefined);
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
  // Tenta ignorar undefined em writes parciais, mas evita crash se Firestore já foi usado
  if (!_dbConfigured) {
    try {
      _db.settings({ ignoreUndefinedProperties: true });
      _dbConfigured = true;
    } catch {
      // Se falhar (settings já aplicadas ou Firestore já usado), seguimos sem alterar
      _dbConfigured = true;
    }
  }
  return _db;
}

export function getAdminStorage(): Storage {
  if (_storage) return _storage;
  _storage = getStorage(ensureApp());
  return _storage;
}

export function getAdminBucket() {
  const storage = getAdminStorage();
  const name = resolveBucketName();
  return name ? storage.bucket(name) : storage.bucket();
}

// ✅ Singletons convenientes (importa estes diretamente se preferires)
export const authAdmin = getAdminAuth();
export const firestoreAdmin = getAdminDb();
export const storageAdmin = getAdminStorage();
export const bucketAdmin = getAdminBucket();
