#!/usr/bin/env node
/**
 * Regera as variantes (640/960/1600 em jpg/webp/avif) das fotos JÁ existentes
 * para passarem a ter marca de água, e fecha o acesso público aos masters.
 *
 * Correr DEPOIS de fazer deploy das Cloud Functions com a marca de água:
 *   cd functions && npm run deploy
 *
 * Uso:
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/watermark-existing-photos.js --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/watermark-existing-photos.js
 *   ... --only=public        (só o portfólio)
 *   ... --only=events        (só as fotos de eventos)
 *   ... --only=covers        (destaques, trail, capas de eventos e categorias)
 *   ... --limit=20           (testar com poucas fotos primeiro)
 *
 * O que faz, por foto:
 *  1. Volta a disparar a Cloud Function (copy-on-self via ficheiro .tmp, que
 *     a function ignora) → variantes novas com marca de água e URLs novos.
 *  2. Remove o token de download do master (o link direto deixa de funcionar).
 *  3. Eventos: apaga o campo `imageUrl` dos docs (apontava para o master).
 *
 * Imagens avulsas (destaques, trail, capas de eventos/categorias), que
 * apontavam para o original: gera a cópia com marca de água com o MESMO
 * módulo do site (functions/lib/shared/watermark, compilado por
 * `npm run build` em functions/), guarda o original em masters/<tipo>/ sem
 * token e troca o URL no Firestore.
 */
const admin = require("firebase-admin");
const path = require("path");
const { randomUUID } = require("crypto");
const sharp = require("sharp");
const { watermarkedJpeg } = require(path.join(__dirname, "../functions/lib/shared/watermark"));

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v === undefined ? true : v];
  }),
);
const DRY = !!args["dry-run"];
const ONLY = args.only || "all";
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const DELAY_MS = args.delay ? Number(args.delay) : 1500;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || "gallery-e87e5.firebasestorage.app",
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let processed = 0;

async function retrigger(masterPath) {
  const file = bucket.file(masterPath);
  const [exists] = await file.exists();
  if (!exists) return "missing";
  if (DRY) return "dry";

  const tmp = bucket.file(`${masterPath}.tmp`);
  await file.copy(tmp);
  await tmp.copy(file); // dispara onPublicMasterUpload / onEventMasterUpload
  await tmp.delete().catch(() => {});
  // Fecha o link público do master (o token copiado volta a ser removido)
  await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: null } });
  return "ok";
}

async function handle(label, ref, masterPath, extraUpdate) {
  if (processed >= LIMIT) return false;
  processed += 1;
  try {
    const res = await retrigger(masterPath);
    if (res === "ok" && extraUpdate) await ref.update(extraUpdate);
    console.log(`  ${res === "ok" ? "✓" : res === "dry" ? "·" : "⚠"} [${label}] ${ref.path} (${res})`);
  } catch (err) {
    console.error(`  ✗ [${label}] ${ref.path}: ${err.message}`);
  }
  if (!DRY) await sleep(DELAY_MS);
  return true;
}

async function publicPhotos() {
  const snap = await db.collection("public_photos").get();
  console.log(`Portfólio: ${snap.size} fotos`);
  for (const doc of snap.docs) {
    const masterPath = doc.data().masterPath;
    if (!masterPath || !masterPath.startsWith("masters/public/") || masterPath.endsWith(".tmp")) continue;
    if (!(await handle("public", doc.ref, masterPath))) return;
  }
}

async function eventPhotos() {
  const events = await db.collection("events").get();
  console.log(`Eventos: ${events.size}`);
  for (const ev of events.docs) {
    const photos = await ev.ref.collection("photos").get();
    for (const doc of photos.docs) {
      const data = doc.data();
      const masterPath = data.masterPath;
      if (!masterPath || !masterPath.startsWith("masters/events/") || masterPath.startsWith("masters/events/covers/")) continue;
      const extra = data.imageUrl ? { imageUrl: admin.firestore.FieldValue.delete() } : null;
      if (!(await handle("event", doc.ref, masterPath, extra))) return;
    }
  }
}

const COVER_KINDS = {
  highlights: { master: "masters/highlights", variant: "variants/highlights" },
  trail: { master: "masters/trail", variant: "variants/trail" },
  "event-covers": { master: "masters/events/covers", variant: "variants/events/covers" },
  categories: { master: "masters/categories", variant: "variants/categories" },
};

function storagePathFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const m = new URL(url).pathname.match(/\/b\/([^/]+)\/o\/([^?]+)/);
    if (!m || m[1] !== bucket.name) return null;
    return decodeURIComponent(m[2]);
  } catch {
    return null;
  }
}

const downloadUrl = (p, token) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(p)}?alt=media&token=${token}`;

async function migrateCover(label, ref, field, kind) {
  if (processed >= LIMIT) return false;
  const data = (await ref.get()).data() || {};
  const src = storagePathFromUrl(data[field]);
  if (!src || src.startsWith("variants/")) return true; // já migrada / externa
  processed += 1;
  try {
    const cfg = COVER_KINDS[kind];
    const file = bucket.file(src);
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`  ⚠ [${label}] ${ref.path} (missing ${src})`);
      return true;
    }
    if (DRY) {
      console.log(`  · [${label}] ${ref.path} (${src})`);
      return true;
    }
    const base = src.split("/").pop();
    const ext = base.includes(".") ? base.split(".").pop() : "jpg";
    const id = kind === "categories" ? `${ref.id}-${randomUUID()}` : base.replace(/\.[^.]+$/, "");
    const masterPath = src.startsWith(`${cfg.master}/`) ? src : `${cfg.master}/${id}.${ext}`;
    const variantPath = `${cfg.variant}/${id}.jpg`;

    const [buffer] = await file.download();
    const jpeg = await watermarkedJpeg(sharp, buffer);
    const token = randomUUID();
    await bucket.file(variantPath).save(jpeg, {
      resumable: false,
      contentType: "image/jpeg",
      metadata: {
        cacheControl: "public,max-age=3600",
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    if (masterPath !== src) await file.copy(bucket.file(masterPath));
    await bucket.file(masterPath).setMetadata({
      cacheControl: "private,no-store",
      metadata: { firebaseStorageDownloadTokens: null },
    });
    await ref.update({ [field]: downloadUrl(variantPath, token) });
    // Capas antigas das categorias estavam numa pasta pública: remove-as.
    if (src.startsWith("categories/")) await file.delete().catch(() => {});
    console.log(`  ✓ [${label}] ${ref.path} → ${variantPath}`);
  } catch (err) {
    console.error(`  ✗ [${label}] ${ref.path}: ${err.message}`);
  }
  if (!DRY) await sleep(DELAY_MS);
  return true;
}

async function coverImages() {
  const groups = [
    ["highlights", "highlights", "imageUrl", "highlights"],
    ["trail", "trail_images", "imageUrl", "trail"],
    ["event-cover", "events", "coverUrl", "event-covers"],
    ["category", "categories", "coverUrl", "categories"],
  ];
  for (const [label, collection, field, kind] of groups) {
    const snap = await db.collection(collection).get();
    console.log(`${label}: ${snap.size} docs`);
    for (const doc of snap.docs) {
      if (!(await migrateCover(label, doc.ref, field, kind))) return;
    }
  }
}

(async () => {
  console.log(DRY ? "MODO DRY-RUN (nada é alterado)\n" : "");
  if (ONLY === "all" || ONLY === "public") await publicPhotos();
  if (ONLY === "all" || ONLY === "events") await eventPhotos();
  if (ONLY === "all" || ONLY === "covers") await coverImages();
  console.log(`\nConcluído: ${processed} fotos.`);
})().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
