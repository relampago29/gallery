export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";

/**
 * GET /api/session-orders/my-orders
 * Returns all session orders for the authenticated user, sorted by createdAt desc.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection("session_orders")
      .where("userId", "==", uid)
      .limit(50)
      .get();

    const orders = snapshot.docs
      .map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          status: data.status || "pending",
          sessionId: data.sessionId,
          sessionName: data.sessionName || data.sessionId,
          selectedCount:
            data.selectedCount ||
            (Array.isArray(data.selectedPhotos)
              ? data.selectedPhotos.length
              : 0),
          createdAt: data.createdAt || null,
          token: data.publicToken || null,
        };
      })
      // Only show relevant orders (exclude rejected/cancelled)
      .filter((o) => o.status !== "rejected" && o.status !== "cancelled")
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
