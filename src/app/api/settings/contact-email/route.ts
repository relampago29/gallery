import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOC_PATH = "settings/contact";

/**
 * GET /api/settings/contact-email
 * Lê a accessKey do StaticForms guardada no Firestore.
 * Endpoint público (o formulário de contacto precisa dela).
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.doc(DOC_PATH).get();
    const accessKey = snap.exists ? (snap.data()?.accessKey ?? null) : null;
    return NextResponse.json({
      accessKey: typeof accessKey === "string" ? accessKey : null,
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
 * Guarda/atualiza a accessKey do StaticForms.
 * Requer admin autenticado.
 */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const accessKey =
      typeof body?.accessKey === "string" ? body.accessKey.trim() : "";

    if (!accessKey) {
      return NextResponse.json(
        { error: "accessKey is required" },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    await db
      .doc(DOC_PATH)
      .set(
        { accessKey, updatedAt: new Date().toISOString(), updatedBy: uid },
        { merge: true },
      );

    return NextResponse.json({ accessKey });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
