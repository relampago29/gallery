export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";

type RouteParams = { params: Promise<{ orderId: string }> };

async function requireUser(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7));
    return decoded.uid || null;
  } catch {
    return null;
  }
}

async function isAdmin(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return false;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7));
    return (decoded as any)?.isAdmin === true;
  } catch {
    return false;
  }
}

/** GET /api/event-orders/[orderId] — estado do pedido */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "missing orderId" }, { status: 400 });
    }

    const searchParams = new URL(req.url).searchParams;
    const token = searchParams.get("token") || null;
    const admin = await isAdmin(req);
    const uid = await requireUser(req);

    const db = getAdminDb();
    const snap = await db.collection("event_orders").doc(orderId).get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "pedido não encontrado" },
        { status: 404 }
      );
    }

    const data = snap.data() || {};

    // Auth: admin, owner, or token
    if (!admin) {
      if (uid && uid === data.userId) {
        // owner OK
      } else if (token && token === data.publicToken) {
        // token OK
      } else {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.json({
      id: snap.id,
      status: data.status,
      userId: data.userId,
      itemCount:
        data.itemCount || (Array.isArray(data.items) ? data.items.length : 0),
      totalPrice: data.totalPrice || 0,
      eventNames: data.eventNames || {},
      createdAt: data.createdAt || null,
      paymentConfirmedAt:
        data.paymentConfirmedAtMs || data.paymentConfirmedAt || null,
      fulfilledAt: data.fulfilledAtMs || data.fulfilledAt || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
