export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { name, description = null } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "missing name" }, { status: 400 });
    }
    const payload = {
      name: name.trim(),
      description,
      active: true,
      createdAt: Date.now(),
      createdAtServer: FieldValue.serverTimestamp(),
    };
    const ref = await firestoreAdmin.collection("categories").add(payload);
    return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}
