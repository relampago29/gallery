/**
 * Limpa docs fantasma em public_photos (sem masterPath válido).
 */
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: "gallery-e87e5.firebasestorage.app",
  });
}

const db = admin.firestore();

async function main() {
  const snap = await db.collection("public_photos").get();
  const ghosts = snap.docs.filter((doc) => {
    const data = doc.data();
    // Fantasma = sem masterPath OU masterPath é .tmp OU masterPath vazio
    return !data.masterPath || data.masterPath.endsWith(".tmp");
  });

  console.log("Docs fantasma encontrados:", ghosts.length);
  for (const doc of ghosts) {
    console.log(
      "  Apagar:",
      doc.id,
      "masterPath:",
      doc.data().masterPath || "(vazio)",
    );
    await doc.ref.delete();
  }

  // Resumo final
  const [proc, ready, err] = await Promise.all([
    db.collection("public_photos").where("status", "==", "processing").get(),
    db.collection("public_photos").where("status", "==", "ready").get(),
    db.collection("public_photos").where("status", "==", "error").get(),
  ]);
  console.log("\nEstado final:");
  console.log("  processing:", proc.size);
  console.log("  ready:     ", ready.size);
  console.log("  error:     ", err.size);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
