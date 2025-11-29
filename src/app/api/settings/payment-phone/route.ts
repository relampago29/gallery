import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOC_ID = "payment-phone";

export async function GET() {
  try {
    const snap = await getAdminDb().collection("settings").doc(DOC_ID).get();
    const data = snap.exists ? snap.data() || {} : {};
    const phone = typeof data.phone === "string" ? data.phone : null;
    return NextResponse.json({ phone });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (!phone || phone.length < 6) {
      return NextResponse.json({ error: "phone inválido" }, { status: 400 });
    }
    await getAdminDb().collection("settings").doc(DOC_ID).set(
      {
        phone,
        updatedAt: Date.now(),
        updatedBy: uid,
      },
      { merge: true }
    );
    return NextResponse.json({ phone });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
