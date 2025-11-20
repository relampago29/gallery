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
  createdAt: number;         // do cliente (para paginação imediata)
  masterPath: string;        // ex.: masters/public/{uuid}.jpg
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
      return NextResponse.json({ error: "invalid masterPath" }, { status: 400 });
    }

    const docRef = await firestoreAdmin.collection("public_photos").add({
      title: body.title ?? null,
      alt: body.alt ?? body.title ?? null,
      categoryId: body.categoryId,
      createdAt: body.createdAt,                 // número do cliente (ms)
      createdAtServer: FieldValue.serverTimestamp(), // verdade oficial
      published: false,
      status: "processing",
      masterPath: body.masterPath,
      sequenceNumber: body.sequenceNumber ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: docRef.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
