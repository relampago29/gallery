export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { findPublicMaxSequence, findPrivateMaxSequence } from "@/lib/admin/sequence";

type Payload = {
  mode?: "public" | "private";
  count?: number;
  sessionId?: string;
};

function sanitizeSessionId(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    const mode = body.mode;
    const count = Math.max(1, Math.min(500, Number(body.count) || 1));
    if (!mode) {
      return NextResponse.json({ error: "missing mode" }, { status: 400 });
    }

    const db = getAdminDb();

    if (mode === "public") {
      const ref = db.collection("admin").doc("upload_counters");
      const baseline = await findPublicMaxSequence(db);
      const start = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const last =
          (snap.exists && typeof snap.data()?.public === "number"
            ? (snap.data()!.public as number)
            : baseline) || 0;
        const next = last + count;
        tx.set(
          ref,
          {
            public: next,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return last + 1;
      });

      return NextResponse.json({ start });
    }

    if (mode === "private") {
      const rawSession = body.sessionId || "";
      const sessionId = sanitizeSessionId(rawSession);
      if (!sessionId) {
        return NextResponse.json({ error: "missing sessionId" }, { status: 400 });
      }

      const sessionRef = db.collection("client_sessions").doc(sessionId);
      const now = Date.now();
      const baseline = await findPrivateMaxSequence(db, sessionId);
      const start = await db.runTransaction(async (tx) => {
        const snap = await tx.get(sessionRef);
        const data = snap.exists ? snap.data() : undefined;
        const last =
          data && typeof (data as any)?.lastSequenceNumber === "number"
            ? (data as any).lastSequenceNumber
            : baseline;
        const next = last + count;
        tx.set(
          sessionRef,
          {
            name: data?.name || sessionId,
            status: data?.status || "open",
            createdAt: data?.createdAt || now,
            createdAtServer: data?.createdAtServer || FieldValue.serverTimestamp(),
            lastSequenceNumber: next,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return last + 1;
      });

      return NextResponse.json({ start });
    }

    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
