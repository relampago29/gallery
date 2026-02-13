export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/app/api/session-orders/helpers";

/** GET /api/event-orders/pending — pedidos pendentes para o admin */
export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();

    let snapshot;
    try {
      // Requires composite index (status ASC, createdAt ASC)
      snapshot = await db
        .collection("event_orders")
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .limit(100)
        .get();
    } catch (indexErr: any) {
      // Fallback if composite index not yet deployed
      console.warn(
        "[event-orders/pending] index error, using fallback:",
        indexErr?.message
      );
      snapshot = await db
        .collection("event_orders")
        .where("status", "==", "pending")
        .limit(100)
        .get();
    }

    const items = snapshot.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        userId: d.userId,
        itemCount: d.itemCount || (Array.isArray(d.items) ? d.items.length : 0),
        totalPrice: d.totalPrice || 0,
        eventNames: d.eventNames || {},
        createdAt: d.createdAt || null,
      };
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[event-orders/pending] error:", err);
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
