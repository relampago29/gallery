// Admin-only upload API alinhada ao novo fluxo (masters/** + Firestore doc).
// Suporta dois modos:
//  - mode=public  + categoryId => masters/public/{uuid}.{ext}  + doc em public_photos
//  - mode=private + sessionId  => masters/sessions/{sessionId}/{uuid}.{ext} + doc em client_sessions/{sessionId}/photos
//
// Autenticação: Bearer <Firebase ID token> (verifica via Admin SDK).
// Recomendado: adicionar verificação de "isAdmin" em custom claims (comentado abaixo).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminStorage, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

type Mode = "public" | "private";

function sanitizeId(s: string) {
  return s.replace(/[^A-Za-z0-9_-]/g, "-");
}

function extFromNameOrMime(name?: string | null, mime?: string | null) {
  if (name && name.includes(".")) return name.split(".").pop()!.toLowerCase();
  if (!mime) return "jpg";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

export async function POST(req: NextRequest) {
  try {
    // --- Auth ---
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = decoded.uid;

    // (Opcional) Restringir a admins:
    // if (!decoded.claims?.isAdmin) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    // --- Form data ---
    const form = await req.formData();
    const file = form.get("file");
    const mode = (form.get("mode") as Mode) || "public"; // "public" | "private"
    const categoryId = (form.get("categoryId") as string) || "";
    const sessionId = (form.get("sessionId") as string) || "";
    const title = (form.get("title") as string) || null;
    const alt = (form.get("alt") as string) || title;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (mode === "public" && !categoryId) {
      return NextResponse.json({ error: "Missing categoryId" }, { status: 400 });
    }
    if (mode === "private" && !sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 415 });
    }

    // (Opcional) limitar tamanho (ex.: 60MB)
    const MAX_BYTES = 60 * 1024 * 1024;
    const fileSize = file.size ?? 0;
    if (fileSize > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    // --- Paths ---
    const ext = extFromNameOrMime((form.get("name") as string) || (file as any)?.name, file.type);
    const photoId = randomUUID();
    const safeSession = sanitizeId(sessionId);

    const masterPath =
      mode === "public"
        ? `masters/public/${photoId}.${ext}`
        : `masters/sessions/${safeSession}/${photoId}.${ext}`;

    // --- Upload para Storage ---
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const gcsFile = bucket.file(masterPath);

    await gcsFile.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
      metadata: {
        contentType: file.type || "application/octet-stream",
        // cacheControl para masters não é relevante (são privados por rules)
      },
    });

    // --- Documento no Firestore ---
    const db = getAdminDb();
    const createdAt = Date.now();
    if (mode === "public") {
      const ref = await db.collection("public_photos").add({
        title,
        alt,
        categoryId,
        createdAt,                          // timestamp do cliente (ordenar/paginar já)
        createdAtServer: FieldValue.serverTimestamp(), // verdade oficial
        published: false,                   // só vira true quando a Function marcar "ready"
        status: "processing",
        masterPath,
        createdBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ ok: true, id: ref.id, masterPath }, { status: 201 });
    } else {
      const sessionRef = db.collection("client_sessions").doc(safeSession);
      // (Opcional) certifica que a sessão existe
      const sessSnap = await sessionRef.get();
      if (!sessSnap.exists) {
        await sessionRef.set({
          name: safeSession,
          status: "open",
          createdAt,
          createdAtServer: FieldValue.serverTimestamp(),
          createdBy: uid,
        });
      }
      const ref = await sessionRef.collection("photos").add({
        title,
        alt,
        createdAt,
        createdAtServer: FieldValue.serverTimestamp(),
        status: "processing",
        masterPath,
        createdBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ ok: true, id: ref.id, masterPath }, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
