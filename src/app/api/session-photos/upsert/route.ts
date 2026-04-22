export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

type Body = {
  sessionId?: string;
  name?: string;
  ownerEmail?: string;
};

function sanitizeId(input: string) {
  return input
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** POST /api/session-photos/upsert — cria ou actualiza metadados de uma sessão privada */
export async function POST(req: Request) {
  try {
    const data = (await req.json().catch(() => ({}))) as Partial<Body>;
    const rawSession = data?.sessionId || "";
    const safeSession = sanitizeId(rawSession);
    if (!safeSession) {
      return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
    }

    const name = (data?.name || "").trim() || safeSession;
    const ownerEmail = (data?.ownerEmail || "").trim().toLowerCase();

    // Resolver ownerUid a partir do email (se fornecido)
    let ownerUid: string | null = null;
    let resolvedEmail: string | null = null;
    if (ownerEmail) {
      try {
        const userRecord = await getAdminAuth().getUserByEmail(ownerEmail);
        ownerUid = userRecord.uid;
        resolvedEmail = ownerEmail;
      } catch {
        // Utilizador não existe — ignorar (pode ser atribuído depois)
      }
    }

    const db = getAdminDb();
    const sessionRef = db.collection("client_sessions").doc(safeSession);
    const snap = await sessionRef.get();

    if (snap.exists) {
      const updateData: Record<string, unknown> = {
        name,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (ownerUid) {
        updateData.ownerUid = ownerUid;
        updateData.ownerEmail = resolvedEmail;
      }
      await sessionRef.update(updateData);
    } else {
      const createData: Record<string, unknown> = {
        name,
        status: "open",
        createdAt: Date.now(),
        createdAtServer: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        allowedUsers: {},
        allowedUids: [],
      };
      if (ownerUid) {
        createData.ownerUid = ownerUid;
        createData.ownerEmail = resolvedEmail;
      }
      await sessionRef.set(createData);
    }

    return NextResponse.json({ ok: true, sessionId: safeSession });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
