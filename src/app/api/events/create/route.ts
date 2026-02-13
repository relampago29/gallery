export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

type Body = {
  title?: string;
  coverUrl?: string;
  date?: string;
  pricePerPhoto?: number;
  description?: string;
};

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const data = (await req.json()) as Body;
    const title = (data.title || "").trim();
    const coverUrl = (data.coverUrl || "").trim();
    const date = (data.date || "").trim();
    const pricePerPhoto =
      typeof data.pricePerPhoto === "number" ? data.pricePerPhoto : 0;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!coverUrl) {
      return NextResponse.json(
        { error: "coverUrl is required" },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = await db.collection("events").add({
      title,
      coverUrl,
      date,
      pricePerPhoto,
      description: data.description?.trim() || null,
      photoCount: 0,
      published: true,
      createdAt: Date.now(),
      createdAtServer: FieldValue.serverTimestamp(),
      createdBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
