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

    try {
      let q = firestoreAdmin.collection("public_photos").orderBy("createdAt", "desc");
      if (categoryId) q = q.where("categoryId", "==", categoryId);
      if (cursor) q = q.startAfter(Number(cursor));

      const snap = await q.limit(limitN).get();
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const nextCursor = items.length ? items[items.length - 1].createdAt : null;

      return NextResponse.json({ items, nextCursor });
    } catch (e: any) {
      // Graceful fallback when index is missing: fetch by category without orderBy
      const msg = String(e?.message || "");
      const needsIndex = e?.code === 9 || msg.includes("requires an index");
      if (needsIndex && categoryId) {
        try {
          const snap2 = await firestoreAdmin
            .collection("public_photos")
            .where("categoryId", "==", categoryId)
            .limit(limitN)
            .get();
          const items2 = snap2.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          // No pagination in the fallback to avoid further index needs
          return NextResponse.json({ items: items2, nextCursor: null, warning: "index_missing_fallback" });
        } catch {}
      }
      throw e;
    }
  } catch (e: any) {
    console.error("[/api/public-photos/list] GET failed:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
