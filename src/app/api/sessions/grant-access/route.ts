export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

type Body = {
  sessionId: string;
  guestEmail: string;
  freeAccess?: boolean; // se true, o guest não precisa de pagar
  revoke?: boolean; // se true, remove o acesso
};

/**
 * POST /api/sessions/grant-access
 * Admin adiciona/remove um guest a uma sessão.
 * O guest é identificado por email → UID do Firebase Auth.
 */
export async function POST(req: Request) {
  try {
    const adminUid = await requireAdmin(req);
    if (!adminUid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<Body> & {
      email?: string;
    };
    const sessionId = (body.sessionId || "").trim();
    const guestEmail = (body.guestEmail || body.email || "")
      .trim()
      .toLowerCase();
    const freeAccess = body.freeAccess === true;
    const revoke = body.revoke === true;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId obrigatório" },
        { status: 400 },
      );
    }
    if (!guestEmail) {
      return NextResponse.json(
        { error: "guestEmail obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se o guest existe no Firebase Auth
    let guestUid: string;
    try {
      const userRecord = await getAdminAuth().getUserByEmail(guestEmail);
      guestUid = userRecord.uid;
    } catch {
      return NextResponse.json(
        {
          error: `Utilizador "${guestEmail}" não encontrado. Deve registar-se primeiro.`,
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

    if (revoke) {
      // Remove guest
      await sessionRef.update({
        [`allowedUsers.${guestUid}`]: FieldValue.delete(),
        allowedUids: FieldValue.arrayRemove(guestUid),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const updatedSnap = await sessionRef.get();
      return NextResponse.json({
        ok: true,
        action: "revoked",
        guestUid,
        guestEmail,
        allowedUsers: updatedSnap.data()?.allowedUsers || {},
      });
    }

    // Add guest
    await sessionRef.update({
      [`allowedUsers.${guestUid}`]: {
        email: guestEmail,
        freeAccess,
        grantedAt: Date.now(),
        grantedBy: adminUid,
      },
      allowedUids: FieldValue.arrayUnion(guestUid),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedSnap = await sessionRef.get();
    return NextResponse.json({
      ok: true,
      action: "granted",
      guestUid,
      guestEmail,
      freeAccess,
      allowedUsers: updatedSnap.data()?.allowedUsers || {},
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
