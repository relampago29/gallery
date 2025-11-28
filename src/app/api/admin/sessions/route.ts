export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const snap = await db.collection("client_sessions").orderBy("createdAt", "desc").limit(200).get();
    const sessions = snap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: typeof data.name === "string" ? data.name : doc.id,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
        status: typeof data.status === "string" ? data.status : "open",
        lastSequenceNumber: typeof data.lastSequenceNumber === "number" ? data.lastSequenceNumber : null,
        selectedCount: typeof data.selectedCount === "number" ? data.selectedCount : null,
        paymentStatus: typeof data.paymentStatus === "string" ? data.paymentStatus : null,
      };
    });

    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
