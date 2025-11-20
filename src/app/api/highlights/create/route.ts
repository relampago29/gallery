import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  title?: string;
  imageUrl?: string;
  height?: number;
  order?: number;
  description?: string;
};

function clampHeight(value: number | undefined | null) {
  const fallback = 400;
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(700, Math.max(220, Math.round(value)));
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return null;
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const data = (await req.json()) as Body;
    const title = (data.title || "").trim();
    const imageUrl = (data.imageUrl || "").trim();
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const highlightCol = db.collection("highlights");
    const countSnap = await highlightCol.count().get();
    if (countSnap.data().count >= 12) {
      return NextResponse.json({ error: "Limite máximo de 12 destaques atingido." }, { status: 400 });
    }

    const payload = {
      title: title || "Highlight",
      imageUrl,
      height: clampHeight(data.height),
      order: typeof data.order === "number" ? data.order : Date.now(),
      description: data.description?.trim() || null,
      createdAt: Date.now(),
      createdAtServer: FieldValue.serverTimestamp(),
      createdBy: uid,
    };

    const docRef = await highlightCol.add(payload);
    return NextResponse.json({ ok: true, id: docRef.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
