export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

type Ctx = { params: Promise<{ eventId: string }> };

/** GET /api/events/[eventId] — detalhes do evento */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { eventId } = await ctx.params;
    const db = getAdminDb();
    const snap = await db.collection("events").doc(eventId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ id: snap.id, ...(snap.data() as any) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}

/** PATCH /api/events/[eventId] — atualizar evento */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { eventId } = await ctx.params;
    const body = await req.json();
    const updates: Record<string, any> = {};

    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.coverUrl === "string")
      updates.coverUrl = body.coverUrl.trim();
    if (typeof body.date === "string") updates.date = body.date.trim();
    if (typeof body.pricePerPhoto === "number")
      updates.pricePerPhoto = body.pricePerPhoto;
    if (typeof body.description === "string")
      updates.description = body.description.trim() || null;
    if (typeof body.published === "boolean") updates.published = body.published;

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    updates.updatedBy = uid;

    const db = getAdminDb();
    await db.collection("events").doc(eventId).update(updates);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}

/** DELETE /api/events/[eventId] — apagar evento e fotos */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { eventId } = await ctx.params;
    const db = getAdminDb();

    // apagar subcoleção de fotos
    const photosSnap = await db
      .collection("events")
      .doc(eventId)
      .collection("photos")
      .get();
    const batch = db.batch();
    photosSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection("events").doc(eventId));
    await batch.commit();

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
