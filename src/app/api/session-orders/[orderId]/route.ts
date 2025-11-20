export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../helpers";

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "missing orderId" }, { status: 400 });
    }

    const searchParams = new URL(req.url).searchParams;
    const token = searchParams.get("token") || null;
    const uid = await requireAdmin(req);

    const db = getAdminDb();
    const docRef = db.collection("session_orders").doc(orderId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
    }

    const data = snap.data() || {};
    if (!uid) {
      if (!token || token !== data.publicToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.json({
      id: snap.id,
      status: data.status,
      sessionId: data.sessionId,
      sessionName: data.sessionName || data.sessionId,
      selectedCount: data.selectedCount || (Array.isArray(data.selectedPhotos) ? data.selectedPhotos.length : 0),
      createdAt: data.createdAt || null,
      paymentConfirmedAt: data.paymentConfirmedAt || null,
      fulfilledAt: data.fulfilledAt || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
