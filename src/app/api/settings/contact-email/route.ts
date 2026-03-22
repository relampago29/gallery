import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOC_PATH = "settings/contact";

/**
 * GET /api/settings/contact-email
 * Lê o email de destino do formulário de contacto guardado no Firestore.
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.doc(DOC_PATH).get();
    const email = snap.exists ? (snap.data()?.email ?? null) : null;
    return NextResponse.json({
      email: typeof email === "string" ? email : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/contact-email
 * Guarda/atualiza o email de destino do formulário de contacto.
 * Requer admin autenticado.
 */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const db = getAdminDb();
    await db
      .doc(DOC_PATH)
      .set(
        { email, updatedAt: new Date().toISOString(), updatedBy: uid },
        { merge: true },
      );

    return NextResponse.json({ email });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
