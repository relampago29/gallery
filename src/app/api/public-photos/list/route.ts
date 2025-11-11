export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const limitN = Math.min(Number(searchParams.get("limit") || 24), 100);
    const cursor = searchParams.get("cursor"); // usamos createdAt (number) como cursor

    let q = firestoreAdmin.collection("public_photos").orderBy("createdAt", "desc");
    if (categoryId) q = q.where("categoryId", "==", categoryId);
    if (cursor) q = q.startAfter(Number(cursor));

    const snap = await q.limit(limitN).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const nextCursor = items.length ? items[items.length - 1].createdAt : null;

    return NextResponse.json({ items, nextCursor });
  } catch (e: any) {
    console.error("[/api/public-photos/list] GET failed:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
