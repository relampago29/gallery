// gallery/src/app/api/public-photos/delete/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";

async function deleteById(photoId: string) {
  const ref = firestoreAdmin.collection("public_photos").doc(photoId);
  const snap = await ref.get();
  if (!snap.exists) return; // idempotente: já não existe
  await ref.delete();
}

export async function POST(req: Request) {
  try {
    const { photoId } = await req.json();
    if (!photoId) return NextResponse.json({ error: "missing photoId" }, { status: 400 });
    await deleteById(photoId);
    // A Cloud Function onDelete limpa master + variants/public
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}

// (Opcional) aceitar DELETE
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const photoId = url.searchParams.get("id");
    if (!photoId) return NextResponse.json({ error: "missing id" }, { status: 400 });
    await deleteById(photoId);
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
