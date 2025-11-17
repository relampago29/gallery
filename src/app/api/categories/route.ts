export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const qs = await firestoreAdmin
      .collection("categories")
      .orderBy("name", "asc")
      .get();

    const items = qs.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    // loga no server para veres o erro real no terminal
    console.error("[/api/categories] GET failed:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}
