import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOC_PATH = "settings/payment";

/**
 * GET /api/settings/payment-phone
 * Lê o número de telemóvel MBWay guardado no Firestore.
 * Acesso público (sem auth) — é apenas um número de telefone para exibir.
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.doc(DOC_PATH).get();
    const phone = snap.exists ? snap.data()?.phone ?? null : null;
    return NextResponse.json({
      phone: typeof phone === "string" ? phone : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/payment-phone
 * Guarda/atualiza o número de telemóvel MBWay.
 * Requer admin autenticado.
 */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const db = getAdminDb();
    await db
      .doc(DOC_PATH)
      .set(
        { phone, updatedAt: new Date().toISOString(), updatedBy: uid },
        { merge: true }
      );

    return NextResponse.json({ phone });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
