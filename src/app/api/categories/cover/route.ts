export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";
import { deletePublicImageByUrl, savePublicImage } from "@/lib/publicImages";

/**
 * POST /api/categories/cover  (admin)
 * FormData: file, id (categoria). Guarda o original em privado, publica a
 * capa com marca de água e atualiza `coverUrl` da categoria.
 */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const form = await req.formData();
    const file = form.get("file");
    const id = ((form.get("id") as string) || "").trim();
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "invalid type" }, { status: 415 });
    }

    const ref = firestoreAdmin.collection("categories").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const previousUrl = snap.data()?.coverUrl as string | undefined;

    const saved = await savePublicImage({
      kind: "categories",
      id: `${id}-${randomUUID()}`,
      buffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      originalName: file.name,
    });
    await ref.update({ coverUrl: saved.imageUrl, updatedAt: FieldValue.serverTimestamp() });
    await deletePublicImageByUrl(previousUrl);

    return NextResponse.json({ ok: true, coverUrl: saved.imageUrl }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
