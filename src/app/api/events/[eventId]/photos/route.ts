export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

type Ctx = { params: Promise<{ eventId: string }> };

/** GET /api/events/[eventId]/photos — listar fotos do evento */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { eventId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const limitN = Math.min(Number(searchParams.get("limit") || 60), 200);
    const cursor = searchParams.get("cursor") || null;

    const db = getAdminDb();
    let q = db
      .collection("events")
      .doc(eventId)
      .collection("photos")
      .orderBy("createdAt", "desc");

    if (cursor) {
      q = q.startAfter(Number(cursor));
    }

    const snap = await q.limit(limitN).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const nextCursor =
      items.length === limitN && items.length > 0
        ? items[items.length - 1].createdAt
        : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
