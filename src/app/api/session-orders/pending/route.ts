export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../helpers";

export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection("session_orders")
      .where("status", "==", "pending")
      .limit(100)
      .get();

    const items = snapshot.docs
      .map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          sessionId: data.sessionId,
          sessionName: data.sessionName || data.sessionId,
          selectedCount:
            data.selectedCount ||
            (Array.isArray(data.selectedPhotos)
              ? data.selectedPhotos.length
              : 0),
          createdAt: data.createdAt || null,
          userEmail: data.userEmail || null,
        };
      })
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb; // asc: mais antigas primeiro
      });

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
