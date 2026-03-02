export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { requireAdmin } from "../../../session-orders/helpers";

const COLLECTION = "agenda-events";

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "missing id" }, { status: 400 });

    await firestoreAdmin.collection(COLLECTION).doc(id).delete();
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    console.error("[/api/agenda/events/delete] failed:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 },
    );
  }
}
