export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../../../session-orders/helpers";

type Ctx = { params: Promise<{ eventId: string }> };

/** POST /api/events/[eventId]/photos/delete — apagar foto do evento */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { eventId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const photoId = typeof body?.photoId === "string" ? body.photoId : "";
    if (!photoId) {
      return NextResponse.json({ error: "missing photoId" }, { status: 400 });
    }

    const db = getAdminDb();
    await db
      .collection("events")
      .doc(eventId)
      .collection("photos")
      .doc(photoId)
      .delete();

    // atualizar contador
    const countSnap = await db
      .collection("events")
      .doc(eventId)
      .collection("photos")
      .count()
      .get();
    await db
      .collection("events")
      .doc(eventId)
      .update({ photoCount: countSnap.data().count });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
