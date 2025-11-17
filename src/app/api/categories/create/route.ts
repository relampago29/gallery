export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { name, description = null } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "missing name" }, { status: 400 });
    }

    const db = getAdminDb();

    const payload = {
      name: name.trim(),
      description,
      active: true,
      createdAt: Date.now(),
      createdAtServer: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("categories").add(payload);

    return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}
