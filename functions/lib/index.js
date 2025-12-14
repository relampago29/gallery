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
exports.downloadSessionOrder = exports.onPublicPhotoDelete = exports.onPublicMasterUpload = void 0;
const admin = __importStar(require("firebase-admin"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
// v2 APIs
const v2_1 = require("firebase-functions/v2");
const storage_1 = require("firebase-functions/v2/storage");
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const zip_stream_1 = __importDefault(require("zip-stream"));
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
function sanitizeName(input, fallback = "foto") {
    return ((input || fallback)
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^A-Za-z0-9._-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || fallback);
}
function toDownloadUrl(bucket, path, token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
exports.downloadSessionOrder = (0, https_1.onRequest)({
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: "1GiB",
    cors: true,
}, async (req, res) => {
    try {
        if (req.method !== "GET") {
            res.status(405).json({ error: "method not allowed" });
            return;
        }
        const orderId = req.query.orderId || "";
        const token = req.query.token || null;
        const authHeader = req.headers.authorization || "";
        const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!orderId) {
            res.status(400).json({ error: "missing orderId" });
            return;
        }
        const db = admin.firestore();
        const docRef = db.collection("session_orders").doc(orderId);
        const snap = await docRef.get();
        if (!snap.exists) {
            res.status(404).json({ error: "pedido não encontrado" });
            return;
        }
        let uid = null;
        if (bearer) {
            try {
                const decoded = await admin.auth().verifyIdToken(bearer);
                const isAdmin = decoded?.isAdmin === true ||
                    decoded?.claims?.isAdmin === true ||
                    decoded?.["https://hasura.io/jwt/claims"]?.["x-hasura-default-role"] === "admin";
                if (isAdmin)
                    uid = decoded.uid;
            }
            catch (err) {
                console.error("[downloadSessionOrder] token verification failed", err);
            }
        }
        const data = snap.data() || {};
        if (!uid) {
            if (!token || token !== data.publicToken) {
                res.status(401).json({ error: "unauthorized" });
                return;
            }
        }
        if (data.status !== "paid" && data.status !== "fulfilled") {
            res.status(409).json({ error: "Pagamento ainda não confirmado" });
            return;
        }
        const selectedPhotos = Array.isArray(data.selectedPhotos) ? data.selectedPhotos : [];
        if (!selectedPhotos.length) {
            res.status(400).json({ error: "Sem fotos seleccionadas" });
            return;
        }
        const bucket = admin.storage().bucket();
        const bucketName = bucket.name;
        const seenPaths = new Set();
        const usedNames = new Map();
        const entries = [];
        for (const photo of selectedPhotos) {
            const masterPath = typeof photo.masterPath === "string" ? photo.masterPath : null;
            if (!masterPath || seenPaths.has(masterPath))
                continue;
            const [exists] = await bucket.file(masterPath).exists().catch(() => [false]);
            if (!exists) {
                console.warn("[downloadSessionOrder] file missing", masterPath);
                continue;
            }
            seenPaths.add(masterPath);
            const ext = masterPath.includes(".") ? masterPath.split(".").pop() || "jpg" : "jpg";
            const baseName = sanitizeName(String(photo.title || masterPath.split("/").pop() || "foto"));
            let finalName = baseName.toLowerCase().endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;
            if (usedNames.has(finalName)) {
                const count = usedNames.get(finalName) + 1;
                usedNames.set(finalName, count);
                const base = finalName.replace(/\.[^.]+$/, "");
                finalName = `${base}-${count}.${ext}`;
            }
            else {
                usedNames.set(finalName, 0);
            }
            entries.push({
                name: finalName,
                path: masterPath,
                createdAt: typeof photo.createdAt === "number" ? photo.createdAt : null,
            });
        }
        if (!entries.length) {
            res.status(500).json({ error: "Não foi possível gerar o ZIP" });
            return;
        }
        const zip = new zip_stream_1.default({ zlib: { level: 0 } }); // store only, evitar inflar JPG
        res.setHeader("Content-Type", "application/zip");
        const zipName = sanitizeName(data.sessionName || data.sessionId || "sessao");
        res.setHeader("Content-Disposition", `attachment; filename=\"${zipName}.zip\"`);
        res.setHeader("Cache-Control", "private, max-age=30");
        zip.on("error", (err) => {
            console.error("[downloadSessionOrder] zip error", err);
            res.destroy(err instanceof Error ? err : new Error(String(err)));
        });
        zip.pipe(res);
        let appended = 0;
        let aborted = false;
        const abortHandler = () => {
            aborted = true;
            zip.destroy(new Error("client closed connection"));
        };
        res.once("close", abortHandler);
        for (const entry of entries) {
            if (aborted)
                break;
            const file = bucket.file(entry.path);
            const stream = file.createReadStream();
            try {
                await new Promise((resolve, reject) => {
                    stream.on("error", reject);
                    zip.entry(stream, { name: entry.name, date: entry.createdAt ? new Date(entry.createdAt) : new Date(), store: true }, (err) => {
                        if (err)
                            return reject(err);
                        resolve();
                    });
                });
                appended += 1;
                console.log("[downloadSessionOrder] appended", { name: entry.name, appended, total: entries.length });
            }
            catch (err) {
                console.error("[downloadSessionOrder] entry failed", entry.name, err);
                aborted = true;
                zip.destroy(err instanceof Error ? err : new Error(String(err)));
                break;
            }
        }
        if (!aborted) {
            zip.finalize();
        }
        await new Promise((resolve, reject) => {
            const onEnd = () => resolve();
            const onError = (err) => reject(err instanceof Error ? err : new Error(String(err)));
            zip.once("finish", onEnd);
            zip.once("end", onEnd);
            zip.once("error", onError);
            res.once("error", onError);
        });
        res.off("close", abortHandler);
        try {
            await docRef.update({
                status: "fulfilled",
                fulfilledAt: admin.firestore.FieldValue.serverTimestamp(),
                fulfilledAtMs: Date.now(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (err) {
            console.error("[downloadSessionOrder] failed to update order", err);
        }
    }
    catch (err) {
        console.error("[downloadSessionOrder] unexpected", err);
        if (!res.headersSent) {
            res.status(500).json({ error: err?.message || "server error" });
        }
        else {
            res.end();
        }
    }
});
