export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { requireAdmin } from "../../../session-orders/helpers";

const COLLECTION = "agenda-equipment";

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    await firestoreAdmin.collection(COLLECTION).doc(id).delete();

    // Also remove this equipment id from all events that reference it
    const eventsSnap = await firestoreAdmin
      .collection("agenda-events")
      .where("equipmentIds", "array-contains", id)
      .get();

    const batch = firestoreAdmin.batch();
    for (const doc of eventsSnap.docs) {
      const data = doc.data();
      batch.update(doc.ref, {
        equipmentIds: (data.equipmentIds as string[]).filter(
          (eqId) => eqId !== id,
        ),
      });
    }
    if (!eventsSnap.empty) await batch.commit();

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    console.error("[/api/agenda/equipment/delete] failed:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 },
    );
  }
}
