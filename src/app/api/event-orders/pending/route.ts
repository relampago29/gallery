export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { requireAdmin } from "@/app/api/session-orders/helpers";

/** GET /api/event-orders/pending — pedidos pendentes para o admin */
export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

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
        indexErr?.message,
      );
      snapshot = await db
        .collection("event_orders")
        .where("status", "==", "pending")
        .limit(100)
        .get();
    }

    // Collect unique userIds to resolve display names & emails
    const userIds = new Set<string>();
    for (const doc of snapshot.docs) {
      const userId = doc.data()?.userId;
      if (typeof userId === "string" && userId) userIds.add(userId);
    }

    // Resolve user info in parallel
    const userMap: Record<
      string,
      { displayName: string | null; email: string | null }
    > = {};
    await Promise.all(
      [...userIds].map(async (id) => {
        try {
          const userRecord = await auth.getUser(id);
          userMap[id] = {
            displayName: userRecord.displayName || null,
            email: userRecord.email || null,
          };
        } catch {
          userMap[id] = { displayName: null, email: null };
        }
      }),
    );

    const items = snapshot.docs.map((doc) => {
      const d = doc.data() || {};
      const user = d.userId ? userMap[d.userId] : null;
      return {
        id: doc.id,
        userId: d.userId,
        userName: user?.displayName || null,
        userEmail: user?.email || null,
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
      { status: 500 },
    );
  }
}
