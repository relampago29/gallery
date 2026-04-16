/**
 * Script para reprocessar fotos públicas presas em "processing".
 *
 * Uso:
 *   GOOGLE_APPLICATION_CREDENTIALS=../gallery-e87e5-firebase-adminsdk-fbsvc-3b271ae549.json \
 *   node scripts/reprocess-stuck-photos.js
 *
 * O que faz:
 *   1. Procura todos os docs em public_photos com status "processing"
 *   2. Para cada um, faz re-upload do master (copia sobre si mesmo) para re-disparar a Cloud Function
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: "gallery-e87e5.firebasestorage.app",
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function main() {
  const snap = await db
    .collection("public_photos")
    .where("status", "==", "processing")
    .get();

  console.log(`Encontradas ${snap.size} fotos em "processing"`);

  for (const doc of snap.docs) {
    const data = doc.data();
    const masterPath = data.masterPath;
    console.log(`\nDoc ${doc.id}: masterPath=${masterPath}`);

    if (!masterPath) {
      console.log("  ⚠ Sem masterPath — a saltar");
      continue;
    }

    const file = bucket.file(masterPath);
    const [exists] = await file.exists();

    if (!exists) {
      console.log("  ⚠ Master não existe no Storage — a marcar como erro");
      await doc.ref.update({
        status: "error",
        errorMessage: "Master file not found in Storage",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      continue;
    }

    // Re-copiar o ficheiro sobre si mesmo para re-disparar onObjectFinalized
    console.log("  ↻ A re-disparar processamento (copy-on-self)...");
    const tempPath = masterPath + ".tmp";
    await file.copy(bucket.file(tempPath));
    await bucket.file(tempPath).copy(file);
    await bucket.file(tempPath).delete();
    console.log("  ✓ Cloud Function deve processar em breve");
  }

  console.log("\nConcluído!");
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
