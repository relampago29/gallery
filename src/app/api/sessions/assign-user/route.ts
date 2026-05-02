export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

type Body = {
  sessionId: string;
  ownerEmail: string;
};

/**
 * POST /api/sessions/assign-user
 * Admin atribui uma sessão a um utilizador (por email).
 * Se o utilizador não existir no Firebase Auth, retorna erro.
 */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<Body> & {
      email?: string;
    };
    const sessionId = (body.sessionId || "").trim();
    const ownerEmail = (body.ownerEmail || body.email || "")
      .trim()
      .toLowerCase();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId obrigatório" },
        { status: 400 },
      );
    }
    if (!ownerEmail) {
      return NextResponse.json(
        { error: "ownerEmail obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se o utilizador existe no Firebase Auth
    let ownerUid: string;
    try {
      const userRecord = await getAdminAuth().getUserByEmail(ownerEmail);
      ownerUid = userRecord.uid;
    } catch {
      return NextResponse.json(
        {
          error: `Utilizador com email "${ownerEmail}" não encontrado. O utilizador deve registar-se primeiro.`,
        },
        { status: 404 },
      );
    }

    const db = getAdminDb();
    const sessionRef = db.collection("client_sessions").doc(sessionId);
    const snap = await sessionRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    await sessionRef.update({
      ownerUid,
      ownerEmail,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, ownerUid, ownerEmail });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
