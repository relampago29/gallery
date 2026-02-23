export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

type Body = {
  sessionId?: string;
  name?: string;
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
    const db = getAdminDb();
    const sessionRef = db.collection("client_sessions").doc(safeSession);
    const snap = await sessionRef.get();

    if (snap.exists) {
      // Update name (and touch updatedAt)
      await sessionRef.update({
        name,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await sessionRef.set({
        name,
        status: "open",
        createdAt: Date.now(),
        createdAtServer: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ ok: true, sessionId: safeSession });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
