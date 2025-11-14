export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

type Body = {
  sessionId: string;
  masterPath: string;
  title?: string | null;
  alt?: string | null;
  createdAt?: number;
};

function sanitizeId(input: string) {
  return input.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Partial<Body>;
    const rawSession = data?.sessionId || "";
    const safeSession = sanitizeId(rawSession);
    if (!safeSession) {
      return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
    }
    if (!data?.masterPath) {
      return NextResponse.json({ error: "missing masterPath" }, { status: 400 });
    }
    if (!data.masterPath.startsWith(`masters/sessions/${safeSession}/`)) {
      return NextResponse.json({ error: "masterPath does not belong to session" }, { status: 400 });
    }

    const db = getAdminDb();
    const sessionRef = db.collection("client_sessions").doc(safeSession);
    const createdAt = Number.isFinite(data?.createdAt) ? Number(data?.createdAt) : Date.now();

    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      await sessionRef.set({
        name: safeSession,
        status: "open",
        createdAt,
        createdAtServer: FieldValue.serverTimestamp(),
      });
    }

    const photoRef = await sessionRef.collection("photos").add({
      title: data?.title ?? null,
      alt: data?.alt ?? data?.title ?? null,
      masterPath: data.masterPath,
      createdAt,
      createdAtServer: FieldValue.serverTimestamp(),
      status: "ready",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: photoRef.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}

