import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = { imageUrl?: string | null; order?: number };

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as Body;
    const imageUrl = (payload.imageUrl || "").trim();
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = await db.collection("trail_images").add({
      imageUrl,
      order: typeof payload.order === "number" ? payload.order : Date.now(),
      createdAt: Date.now(),
      createdAtServer: FieldValue.serverTimestamp(),
      createdBy: uid,
    });

    return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
