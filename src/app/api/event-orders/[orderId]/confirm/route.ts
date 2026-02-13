export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/app/api/session-orders/helpers";

type RouteParams = { params: Promise<{ orderId: string }> };

/** POST /api/event-orders/[orderId]/confirm — admin confirma pagamento */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "missing orderId" }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection("event_orders").doc(orderId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "pedido não encontrado" },
        { status: 404 }
      );
    }

    const data = snap.data() || {};
    if (data.status === "paid" || data.status === "fulfilled") {
      await docRef.update({ updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ ok: true, status: data.status });
    }

    await docRef.update({
      status: "paid",
      paymentConfirmedAt: FieldValue.serverTimestamp(),
      paymentConfirmedAtMs: Date.now(),
      paymentConfirmedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, status: "paid" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
