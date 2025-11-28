export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

type Body = {
  sessionId?: string;
  name?: string | null;
};

function sanitizeId(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => ({}))) as Body;
    const sessionId = sanitizeId(payload.sessionId || "");
    if (!sessionId) {
      return NextResponse.json({ error: "missing sessionId" }, { status: 400 });
    }
    const name =
      typeof payload.name === "string" && payload.name.trim().length ? payload.name.trim() : null;

    const db = getAdminDb();
    const ref = db.collection("client_sessions").doc(sessionId);
    await ref.set(
      {
        name: name || sessionId,
        updatedAt: Date.now(),
        updatedAtServer: FieldValue.serverTimestamp(),
        status: "open",
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
