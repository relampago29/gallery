export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, bucketAdmin } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const snap = await db
      .collection("client_sessions")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    const sessions = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data() || {};
        const photosSnap = await doc.ref.collection("photos").count().get();
        return {
          id: doc.id,
          name: typeof data.name === "string" ? data.name : doc.id,
          createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
          status: typeof data.status === "string" ? data.status : "open",
          lastSequenceNumber:
            typeof data.lastSequenceNumber === "number"
              ? data.lastSequenceNumber
              : null,
          selectedCount:
            typeof data.selectedCount === "number" ? data.selectedCount : null,
          paymentStatus:
            typeof data.paymentStatus === "string" ? data.paymentStatus : null,
          photoCount: photosSnap.data().count ?? 0,
        };
      }),
    );

    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.id === "string" ? body.id.trim() : "";
    if (!sessionId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const sessionRef = db.collection("client_sessions").doc(sessionId);

    // 1. Delete photos subcollection (Firestore does NOT delete subcollections automatically)
    const photosSnap = await sessionRef.collection("photos").limit(500).get();
    if (!photosSnap.empty) {
      const photosBatch = db.batch();
      photosSnap.docs.forEach((doc) => photosBatch.delete(doc.ref));
      await photosBatch.commit();
    }

    // 2. Delete related session_orders
    const ordersSnap = await db
      .collection("session_orders")
      .where("sessionId", "==", sessionId)
      .limit(200)
      .get();

    // 3. Delete session document + orders in one batch
    const batch = db.batch();
    batch.delete(sessionRef);
    ordersSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // 4. Delete storage files (masters/sessions/{sessionId}/*)
    try {
      const prefix = `masters/sessions/${sessionId}/`;
      await bucketAdmin.deleteFiles({ prefix, force: true });
    } catch {
      // Ignore storage errors — files may not exist
    }

    return NextResponse.json({
      ok: true,
      deletedOrders: ordersSnap.size,
      deletedPhotos: photosSnap.size,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
