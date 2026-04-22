/**
 * Reprocessa todas as fotos com status "error" ou "processing" —
 * reset para "processing" e re-dispara a Cloud Function via copy-on-self.
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
  const [errSnap, procSnap] = await Promise.all([
    db.collection("public_photos").where("status", "==", "error").get(),
    db.collection("public_photos").where("status", "==", "processing").get(),
  ]);

  const docs = [...errSnap.docs, ...procSnap.docs];
  console.log("A reprocessar:", docs.length, "fotos");

  for (const doc of docs) {
    const data = doc.data();
    const masterPath = data.masterPath;

    if (
      !masterPath ||
      !masterPath.startsWith("masters/public/") ||
      masterPath.endsWith(".tmp")
    ) {
      console.log("  ⚠ Saltar:", doc.id, "(sem masterPath válido)");
      continue;
    }

    const file = bucket.file(masterPath);
    const [exists] = await file.exists();
    if (!exists) {
      console.log("  ⚠ Master não existe no Storage:", masterPath);
      await doc.ref.update({
        status: "error",
        errorMessage: "Master file not found in Storage",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      continue;
    }

    // Reset para processing
    await doc.ref.update({
      status: "processing",
      errorMessage: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Re-disparar via copy-on-self (o .tmp é ignorado pela Cloud Function)
    const tempPath = masterPath + ".tmp";
    try {
      await file.copy(bucket.file(tempPath));
      await bucket.file(tempPath).copy(file);
      await bucket
        .file(tempPath)
        .delete()
        .catch(() => {});
      console.log("  ✓ Re-triggered:", doc.id);
    } catch (err) {
      console.error("  ✗ Erro ao re-disparar:", doc.id, err.message);
    }
  }

  console.log("\nConcluído!");
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
