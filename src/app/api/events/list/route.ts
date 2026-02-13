export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitN = Math.min(Number(searchParams.get("limit") || 50), 100);
    const publishedOnly = searchParams.get("published") === "true";
    const cursor = searchParams.get("cursor") || null;

    const db = getAdminDb();

    let items: any[];

    if (publishedOnly) {
      // Try composite index (published + date desc).
      // If the index is still building, fall back to orderBy only + in-memory filter.
      try {
        let q = db
          .collection("events")
          .where("published", "==", true)
          .orderBy("date", "desc");
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.limit(limitN).get();
        items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      } catch {
        // Fallback: fetch all ordered by date and filter in memory
        let q = db.collection("events").orderBy("date", "desc");
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.limit(limitN * 3).get();
        items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((e) => e.published === true)
          .slice(0, limitN);
      }
    } else {
      let q = db.collection("events").orderBy("date", "desc");
      if (cursor) q = q.startAfter(cursor);
      const snap = await q.limit(limitN).get();
      items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    }

    const nextCursor =
      items.length === limitN && items.length > 0
        ? items[items.length - 1].date
        : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err: any) {
    console.error("[/api/events/list] GET failed:", err);
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
