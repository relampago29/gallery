export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../helpers";

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

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
    const docRef = db.collection("session_orders").doc(orderId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "pedido não encontrado" },
        { status: 404 },
      );
    }

    const data = snap.data() || {};
    if (data.status === "paid" || data.status === "fulfilled") {
      await docRef.update({ updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json(
        { ok: true, status: data.status },
        { status: 200 },
      );
    }

    await docRef.update({
      status: "paid",
      paymentConfirmedAt: FieldValue.serverTimestamp(),
      paymentConfirmedAtMs: Date.now(),
      paymentConfirmedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Grant free access on the client_sessions document so the session no
    // longer appears under "pagamentos pendentes" in the client dashboard.
    const sessionId: string | undefined = data.sessionId;
    const userId: string | undefined = data.userId;
    if (sessionId && userId) {
      try {
        const sessionRef = db.collection("client_sessions").doc(sessionId);
        const sessionSnap = await sessionRef.get();
        if (sessionSnap.exists) {
          const sessionData = sessionSnap.data() || {};
          if (sessionData.ownerUid === userId) {
            // User is the session owner
            await sessionRef.update({ ownerFreeAccess: true });
          } else {
            // User is a guest — update the nested allowedUsers map
            await sessionRef.update({
              [`allowedUsers.${userId}.freeAccess`]: true,
            });
          }
        }
      } catch (sessionErr: any) {
        // Non-fatal: log but don't fail the confirmation
        console.error(
          "[confirm] failed to grant freeAccess on session",
          sessionErr,
        );
      }
    }

    return NextResponse.json({ ok: true, status: "paid" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
