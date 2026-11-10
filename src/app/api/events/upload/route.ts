export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminStorage, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { Readable } from "node:stream";
import { requireAdmin } from "../../session-orders/helpers";
import { extFromNameOrMime, savePublicImage } from "@/lib/publicImages";

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

    // Capa: original privado + cópia com marca de água (igual a destaques/trail).
    if (type === "cover") {
      const saved = await savePublicImage({
        kind: "event-covers",
        buffer: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
        originalName,
      });
      return NextResponse.json(
        { ok: true, masterPath: saved.masterPath, imageUrl: saved.imageUrl },
        { status: 201 }
      );
    }

    if (!eventId) {
      return NextResponse.json({ error: "missing eventId" }, { status: 400 });
    }

    const ext = extFromNameOrMime(originalName, file.type);
    const photoId = randomUUID();
    const storagePath = `masters/events/${eventId}/${photoId}.${ext}`;
    const bucket = getAdminStorage().bucket();

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
          // Master privado (sem token): as variantes com marca de água são
          // geradas pela Cloud Function onEventMasterUpload.
          cacheControl: "private,no-store",
        },
      });
      ws.on("error", reject);
      ws.on("finish", resolve);
      inputStream.on("error", reject);
      inputStream.pipe(ws);
    });

    const db = getAdminDb();
    const ref = await db
      .collection("events")
      .doc(eventId)
      .collection("photos")
      .add({
        title: title || null,
        masterPath: storagePath,
        // Sem imageUrl: o master não pode ser público. As variantes com
        // marca de água são geradas pela Cloud Function onEventMasterUpload.
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
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "upload failed" },
      { status: 500 }
    );
  }
}
