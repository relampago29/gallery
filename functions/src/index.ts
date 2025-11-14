import * as admin from "firebase-admin";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// v2 APIs
import { setGlobalOptions } from "firebase-functions/v2";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";

// Tipos dos eventos (úteis para TS)
import type { CloudEvent } from "firebase-functions/v2";
import type { StorageObjectData } from "@google/events/cloud/storage/v1/StorageObjectData";
import type {
  FirestoreEvent,
  DocumentSnapshot,
} from "firebase-functions/v2/firestore";

admin.initializeApp();

// ✔ Define região e recursos globais para TODAS as funções v2
setGlobalOptions({
  region: "europe-west1", // região suportada pelo Firebase
  timeoutSeconds: 540,
  memory: "1GiB",
});

// larguras a gerar
const SIZES = [640, 960, 1600];

type SizeEntry = {
  jpg: string;
  webp?: string;
  avif?: string;
  width: number;
  height: number;
};

function makeDownloadUrl(bucketName: string, path: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    path
  )}?alt=media&token=${token}`;
}

/**
 * Trigger v2: quando um master é carregado em masters/public/{photoId}.{ext}
 * Gera variantes (jpg/webp/avif) e atualiza Firestore com sizes + published:true.
 */
export const onPublicMasterUpload = onObjectFinalized(
  async (event: CloudEvent<StorageObjectData>) => {
    const object = event.data;
    if (!object) return;

    const name = object.name ?? "";
    const contentType = object.contentType ?? "";
    // garante string; se vier undefined, usa o nome do bucket default do Admin SDK
    const bucketName = object.bucket ?? admin.storage().bucket().name;

    if (!name || !contentType) return;
    if (!name.startsWith("masters/public/")) return;

    // photoId = nome sem extensão
    const fileName = name.split("/").pop()!;
    const photoId = fileName.replace(/\.[^.]+$/, "");

    const bucket = admin.storage().bucket(bucketName);
    const [masterBuffer] = await bucket.file(name).download();

    // metadados para proporção
    const baseMeta = await sharp(masterBuffer).metadata();
    const masterW = baseMeta.width ?? SIZES[SIZES.length - 1];
    const masterH = baseMeta.height ?? SIZES[SIZES.length - 1];

    const sizes: Record<string, SizeEntry> = {};

    for (const targetW of SIZES) {
      const width = Math.min(targetW, masterW);
      const height = Math.round((masterH * width) / masterW);

      const pipeline = sharp(masterBuffer).rotate().resize({
        width,
        withoutEnlargement: true,
      });

      const [jpgBuf, webpBuf, avifBuf] = await Promise.all([
        pipeline.clone().jpeg({ quality: 82 }).toBuffer(),
        pipeline.clone().webp({ quality: 82 }).toBuffer(),
        pipeline.clone().avif({ quality: 60 }).toBuffer(),
      ]);

      const basePrefix = `variants/public/${photoId}`;
      const jpgPath = `${basePrefix}/${width}.jpg`;
      const webpPath = `${basePrefix}/${width}.webp`;
      const avifPath = `${basePrefix}/${width}.avif`;

      // token de download público
      const t1 = uuidv4();
      const t2 = uuidv4();
      const t3 = uuidv4();

      await Promise.all([
        bucket.file(jpgPath).save(jpgBuf, {
          resumable: false,
          contentType: "image/jpeg",
          metadata: {
            cacheControl: "public,max-age=31536000,immutable",
            metadata: { firebaseStorageDownloadTokens: t1 },
          },
        }),
        bucket.file(webpPath).save(webpBuf, {
          resumable: false,
          contentType: "image/webp",
          metadata: {
            cacheControl: "public,max-age=31536000,immutable",
            metadata: { firebaseStorageDownloadTokens: t2 },
          },
        }),
        bucket.file(avifPath).save(avifBuf, {
          resumable: false,
          contentType: "image/avif",
          metadata: {
            cacheControl: "public,max-age=31536000,immutable",
            metadata: { firebaseStorageDownloadTokens: t3 },
          },
        }),
      ]);

      sizes[String(width)] = {
        jpg: makeDownloadUrl(bucketName, jpgPath, t1),
        webp: makeDownloadUrl(bucketName, webpPath, t2),
        avif: makeDownloadUrl(bucketName, avifPath, t3),
        width,
        height,
      };
    }

    // Atualiza Firestore: tenta localizar pelo masterPath
    const db = admin.firestore();
    const snap = await db
      .collection("public_photos")
      .where("masterPath", "==", name)
      .limit(1)
      .get();

    if (!snap.empty) {
      await snap.docs[0].ref.update({
        status: "ready",
        published: true,
        sizes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // fallback: grava por id
      await db.collection("public_photos").doc(photoId).set(
        {
          status: "ready",
          published: true,
          sizes,
          masterPath: name,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
);

/**
 * Trigger v2: ao apagar um doc de public_photos/{photoId}
 * Limpa variants e tenta remover o master correspondente.
 */
export const onPublicPhotoDelete = onDocumentDeleted(
  "public_photos/{photoId}",
  async (event) => {
    const { photoId } = event.params as { photoId: string };
    const bucket = admin.storage().bucket();

    try {
      await Promise.all([
        bucket.deleteFiles({ prefix: `variants/public/${photoId}/` }),
        bucket.deleteFiles({ prefix: `masters/public/${photoId}` }),
      ]);
    } catch (e) {
      console.error("[onPublicPhotoDelete] cleanup failed:", e);
    }
  }
);