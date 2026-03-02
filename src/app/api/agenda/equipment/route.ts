export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

const COLLECTION = "agenda-equipment";

/** GET — list all equipment */
export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const qs = await firestoreAdmin
      .collection(COLLECTION)
      .orderBy("createdAt", "asc")
      .get();

    const items = qs.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[/api/agenda/equipment] GET failed:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 },
    );
  }
}

/** POST — create one equipment */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { name } = await req.json();
    if (!name || typeof name !== "string")
      return NextResponse.json({ error: "missing name" }, { status: 400 });

    const payload = {
      name: name.trim(),
      createdAt: Date.now(),
      createdAtServer: FieldValue.serverTimestamp(),
    };

    const ref = await firestoreAdmin.collection(COLLECTION).add(payload);
    return NextResponse.json(
      { ok: true, id: ref.id, name: payload.name },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("[/api/agenda/equipment] POST failed:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 },
    );
  }
}
