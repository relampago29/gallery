export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

type Body = {
  sessionId: string;
  ownerEmail: string;
  ownerFreeAccess?: boolean;
  revoke?: boolean;
};

/**
 * POST /api/sessions/assign-user
 * Admin atribui ou remove o owner de uma sessão.
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
    const revoke = body.revoke === true;
    const ownerFreeAccess = body.ownerFreeAccess === true;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId obrigatório" },
        { status: 400 },
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

    // Remover owner
    if (revoke) {
      await sessionRef.update({
        ownerUid: FieldValue.delete(),
        ownerEmail: FieldValue.delete(),
        ownerFreeAccess: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ ok: true, action: "removed" });
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

    await sessionRef.update({
      ownerUid,
      ownerEmail,
      ownerFreeAccess,
      // Ensure allowedUids exists for array-contains queries
      ...(!snap.data()?.allowedUids && { allowedUids: [], allowedUsers: {} }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, ownerUid, ownerEmail, ownerFreeAccess });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
