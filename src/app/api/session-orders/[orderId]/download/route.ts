export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../helpers";

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

    if (data.status !== "paid" && data.status !== "fulfilled") {
      return NextResponse.json({ error: "Pagamento ainda não confirmado" }, { status: 409 });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const fnOrigin =
      process.env.FIREBASE_FUNCTIONS_ORIGIN || (projectId ? `https://europe-west1-${projectId}.cloudfunctions.net` : null);
    if (!fnOrigin) {
      return NextResponse.json({ error: "functions origin não configurado" }, { status: 500 });
    }

    const redirectUrl = `${fnOrigin}/downloadSessionOrder?orderId=${encodeURIComponent(orderId)}${
      token ? `&token=${encodeURIComponent(token)}` : ""
    }`;

    await docRef.update({
      status: "fulfilled",
      fulfilledAt: FieldValue.serverTimestamp(),
      fulfilledAtMs: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.redirect(redirectUrl, { status: 307 });
  } catch (err: any) {
    console.error("[download] unexpected error", err);
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
