export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminStorage, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { Readable } from "node:stream";
import { requireAdmin } from "../../session-orders/helpers";

function extFromNameOrMime(name?: string | null, mime?: string | null) {
  if (name && name.includes(".")) return name.split(".").pop()!.toLowerCase();
  if (!mime) return "jpg";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("avif")) return "avif";
  return "jpg";
}

function makeDownloadUrl(bucketName: string, path: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    path
  )}?alt=media&token=${token}`;
}

/**
 * POST /api/events/upload
 * Upload da capa do evento OU de fotos para um evento existente.
 * FormData fields: file, type ("cover" | "photo"), eventId (obrigatório se type=photo)
 */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const type = (form.get("type") as string) || "cover"; // "cover" ou "photo"
    const eventId = (form.get("eventId") as string) || "";
    const title = (form.get("title") as string) || null;
    const originalName =
      (form.get("name") as string) || (file as any)?.name || "event";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "invalid type" }, { status: 415 });
    }

    const MAX_BYTES = 60 * 1024 * 1024;
    if ((file.size ?? 0) > MAX_BYTES) {
      return NextResponse.json({ error: "file too large" }, { status: 413 });
    }

    const ext = extFromNameOrMime(originalName, file.type);
    const photoId = randomUUID();

    // Caminho no Storage
    const storagePath =
      type === "cover"
        ? `masters/events/covers/${photoId}.${ext}`
        : `masters/events/${eventId}/${photoId}.${ext}`;

    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const bucketName = bucket.name;
    const token = randomUUID();

    const gcsFile = bucket.file(storagePath);
    const contentType = file.type || "application/octet-stream";
    const inputStream =
      typeof (file as any).stream === "function" &&
      typeof Readable.fromWeb === "function"
        ? Readable.fromWeb((file as any).stream())
        : Readable.from(Buffer.from(await file.arrayBuffer()));

    await new Promise<void>((resolve, reject) => {
      const ws = gcsFile.createWriteStream({
        resumable: true,
        contentType,
        metadata: {
          contentType,
          cacheControl: "public,max-age=31536000,immutable",
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      ws.on("error", reject);
      ws.on("finish", resolve);
      inputStream.on("error", reject);
      inputStream.pipe(ws);
    });

    const downloadUrl = makeDownloadUrl(bucketName, storagePath, token);

    // Se for foto de evento, cria doc no Firestore
    if (type === "photo" && eventId) {
      const db = getAdminDb();
      const ref = await db
        .collection("events")
        .doc(eventId)
        .collection("photos")
        .add({
          title: title || null,
          masterPath: storagePath,
          imageUrl: downloadUrl,
          status: "processing",
          published: false,
          createdAt: Date.now(),
          createdAtServer: FieldValue.serverTimestamp(),
          createdBy: uid,
          updatedAt: FieldValue.serverTimestamp(),
        });

      // atualizar contador de fotos no evento
      const countSnap = await db
        .collection("events")
        .doc(eventId)
        .collection("photos")
        .count()
        .get();
      await db.collection("events").doc(eventId).update({
        photoCount: countSnap.data().count,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        {
          ok: true,
          id: ref.id,
          masterPath: storagePath,
          imageUrl: downloadUrl,
        },
        { status: 201 }
      );
    }

    // Se for capa, retorna só o URL
    return NextResponse.json(
      { ok: true, masterPath: storagePath, imageUrl: downloadUrl },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "upload failed" },
      { status: 500 }
    );
  }
}
