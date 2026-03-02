export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../session-orders/helpers";

const COLLECTION = "agenda-events";

/** GET — list all events */
export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const qs = await firestoreAdmin
      .collection(COLLECTION)
      .orderBy("start", "asc")
      .get();

    const items = qs.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        title: data.title ?? "",
        description: data.description ?? "",
        start: data.start ?? null,
        end: data.end ?? null,
        equipmentIds: data.equipmentIds ?? [],
        assignedUsers: data.assignedUsers ?? [],
        color: data.color ?? null,
      };
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[/api/agenda/events] GET failed:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 },
    );
  }
}

/** POST — create one event */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      title,
      description,
      start,
      end,
      equipmentIds,
      assignedUsers,
      color,
    } = body;

    if (!title || !start || !end)
      return NextResponse.json(
        { error: "missing title/start/end" },
        { status: 400 },
      );

    const payload = {
      title: String(title).trim(),
      description: description ?? "",
      start, // ISO string
      end, // ISO string
      equipmentIds: equipmentIds ?? [],
      assignedUsers: assignedUsers ?? [],
      color: color ?? null,
      createdAt: Date.now(),
      createdAtServer: FieldValue.serverTimestamp(),
    };

    const ref = await firestoreAdmin.collection(COLLECTION).add(payload);
    return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
  } catch (e: any) {
    console.error("[/api/agenda/events] POST failed:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 },
    );
  }
}
