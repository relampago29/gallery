"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPublicPhotoDelete = exports.onPublicMasterUpload = void 0;
const admin = __importStar(require("firebase-admin"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
// v2 APIs
const v2_1 = require("firebase-functions/v2");
const storage_1 = require("firebase-functions/v2/storage");
const firestore_1 = require("firebase-functions/v2/firestore");
admin.initializeApp();
// ✔ Define região e recursos globais para TODAS as funções v2
(0, v2_1.setGlobalOptions)({
    region: "europe-west1", // região suportada pelo Firebase
    timeoutSeconds: 540,
    memory: "1GiB",
});
// larguras a gerar
const SIZES = [640, 960, 1600];
function makeDownloadUrl(bucketName, path, token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
/**
 * Trigger v2: quando um master é carregado em masters/public/{photoId}.{ext}
 * Gera variantes (jpg/webp/avif) e atualiza Firestore com sizes + published:true.
 */
exports.onPublicMasterUpload = (0, storage_1.onObjectFinalized)(async (event) => {
    const object = event.data;
    if (!object)
        return;
    const name = object.name ?? "";
    const contentType = object.contentType ?? "";
    // garante string; se vier undefined, usa o nome do bucket default do Admin SDK
    const bucketName = object.bucket ?? admin.storage().bucket().name;
    if (!name || !contentType)
        return;
    if (!name.startsWith("masters/public/"))
        return;
    // photoId = nome sem extensão
    const fileName = name.split("/").pop();
    const photoId = fileName.replace(/\.[^.]+$/, "");
    const bucket = admin.storage().bucket(bucketName);
    const [masterBuffer] = await bucket.file(name).download();
    // metadados para proporção
    const baseMeta = await (0, sharp_1.default)(masterBuffer).metadata();
    const masterW = baseMeta.width ?? SIZES[SIZES.length - 1];
    const masterH = baseMeta.height ?? SIZES[SIZES.length - 1];
    const sizes = {};
    for (const targetW of SIZES) {
        const width = Math.min(targetW, masterW);
        const height = Math.round((masterH * width) / masterW);
        const pipeline = (0, sharp_1.default)(masterBuffer).rotate().resize({
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
        const t1 = (0, uuid_1.v4)();
        const t2 = (0, uuid_1.v4)();
        const t3 = (0, uuid_1.v4)();
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
    }
    else {
        // fallback: grava por id
        await db.collection("public_photos").doc(photoId).set({
            status: "ready",
            published: true,
            sizes,
            masterPath: name,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
});
/**
 * Trigger v2: ao apagar um doc de public_photos/{photoId}
 * Limpa variants e tenta remover o master correspondente.
 */
exports.onPublicPhotoDelete = (0, firestore_1.onDocumentDeleted)("public_photos/{photoId}", async (event) => {
    const { photoId } = event.params;
    const bucket = admin.storage().bucket();
    try {
        await Promise.all([
            bucket.deleteFiles({ prefix: `variants/public/${photoId}/` }),
            bucket.deleteFiles({ prefix: `masters/public/${photoId}` }),
        ]);
    }
    catch (e) {
        console.error("[onPublicPhotoDelete] cleanup failed:", e);
    }
});
