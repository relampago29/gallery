// src/lib/firebase/admin.ts
// Este módulo é carregado apenas no servidor.
// Garante que não corre no browser.
if (typeof window !== "undefined") {
  throw new Error("firebase/admin.ts só pode ser usado no servidor.");
}

import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// --------------------------------------------------------------------------
// UTIL: Obtém PRIVATE KEY de forma segura (com suporte a Base64)
// --------------------------------------------------------------------------
function resolvePrivateKey(): string | null {
  const key = process.env.FIREBASE_PRIVATE_KEY || null;
  const b64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || null;

  // Se existir versão Base64 (mais comum em Docker/Cloud Build)
  if (b64) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");

      // Caso venha como JSON
      try {
        const parsed = JSON.parse(decoded) as { private_key?: string };
        if (parsed.private_key) {
          return parsed.private_key;
        }
      } catch {
        // fallback: assume que já é PEM
      }

      return decoded;
    } catch {
      // fallback para FIREBASE_PRIVATE_KEY normal
    }
  }

  if (key) {
    return key.replace(/\\n/g, "\n"); // Corrige newlines
  }

  return null;
}

// --------------------------------------------------------------------------
// UTIL: Resolve nome do bucket automaticamente
// --------------------------------------------------------------------------
function resolveBucketName(): string | undefined {
  const envBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (envBucket) return envBucket.trim();

  const project = process.env.FIREBASE_PROJECT_ID;
  if (project) return `${project.trim()}.appspot.com`;

  return undefined;
}

// --------------------------------------------------------------------------
// ESTADO LOCAL (para evitar múltiplas inicializações)
// --------------------------------------------------------------------------
let appInstance: App | null = null;
let firestoreConfigured = false;

// --------------------------------------------------------------------------
// Inicializa Firebase Admin
// Lazy — só corre quando uma API chama isto
// --------------------------------------------------------------------------
export function initFirebaseAdmin(): App {
  if (appInstance) return appInstance;

  const apps = getApps();
  if (apps.length > 0) {
    appInstance = apps[0];
    return appInstance;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = resolvePrivateKey();
  const storageBucket = resolveBucketName();

  // Inicialização com credenciais completas (Auth/Firestore/Storage)
  if (projectId && clientEmail && privateKey) {
    appInstance = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    return appInstance;
  }

  // Inicialização mínima sem Auth (evita crash)
  appInstance = initializeApp(storageBucket ? { storageBucket } : undefined);
  return appInstance;
}

// --------------------------------------------------------------------------
// Acesso aos serviços — lazy
// --------------------------------------------------------------------------
export function getAdminAuth() {
  return getAuth(initFirebaseAdmin());
}

export function getAdminDb() {
  const db = getFirestore(initFirebaseAdmin());
  if (!firestoreConfigured) {
    db.settings({ ignoreUndefinedProperties: true });
    firestoreConfigured = true;
  }
  return db;
}

export function getAdminStorage() {
  return getStorage(initFirebaseAdmin());
}

export function getAdminBucket() {
  return getAdminStorage().bucket(resolveBucketName());
}
