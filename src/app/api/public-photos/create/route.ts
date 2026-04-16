// gallery/src/app/api/public-photos/create/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

type Body = {
  title?: string | null;
  alt?: string | null;
  categoryId: string;
  createdAt: number; // do cliente (para paginação imediata)
  masterPath: string; // ex.: masters/public/{uuid}.jpg
  sequenceNumber?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    // validações básicas
    if (!body?.categoryId || !body?.createdAt || !body?.masterPath) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    // garante que estamos a criar docs apenas para masters públicos (sanidade)
    if (!body.masterPath.startsWith("masters/public/")) {
      return NextResponse.json(
        { error: "invalid masterPath" },
        { status: 400 },
      );
    }

    // Usa photoId como ID do documento (se fornecido) para que a Cloud Function
    // consiga localizar o doc tanto por query como por fallback de ID
    const photoId = (body as any).photoId as string | undefined;
    const data = {
      title: body.title ?? null,
      alt: body.alt ?? body.title ?? null,
      categoryId: body.categoryId,
      createdAt: body.createdAt, // número do cliente (ms)
      createdAtServer: FieldValue.serverTimestamp(), // verdade oficial
      published: false,
      status: "processing",
      masterPath: body.masterPath,
      sequenceNumber: body.sequenceNumber ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    let docId: string;
    if (photoId) {
      await firestoreAdmin.collection("public_photos").doc(photoId).set(data);
      docId = photoId;
    } else {
      const docRef = await firestoreAdmin.collection("public_photos").add(data);
      docId = docRef.id;
    }

    return NextResponse.json({ ok: true, id: docId }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 },
    );
  }
}
