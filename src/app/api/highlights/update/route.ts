import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  id?: string;
  title?: string;
  imageUrl?: string;
  height?: number;
  order?: number;
  description?: string | null;
};

function clampHeight(value: number | undefined | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(700, Math.max(220, Math.round(value)));
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return null;
  }
  try {
    await getAdminAuth().verifyIdToken(token);
    return true;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const authorized = await requireAdmin(req);
    if (!authorized) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as Body;
    const id = payload.id;
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now(), updatedAtServer: FieldValue.serverTimestamp() };
    if (typeof payload.title === "string") updates.title = payload.title.trim();
    if (typeof payload.imageUrl === "string" && payload.imageUrl.trim().length > 0) updates.imageUrl = payload.imageUrl.trim();
    if (typeof payload.description === "string") updates.description = payload.description.trim();
    if (payload.description === null) updates.description = null;
    const clamped = clampHeight(payload.height);
    if (typeof clamped === "number") updates.height = clamped;
    if (typeof payload.order === "number" && !Number.isNaN(payload.order)) updates.order = payload.order;

    const db = getAdminDb();
    await db.collection("highlights").doc(id).set(updates, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
