export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const db = getAdminDb();

    const qs = await db
      .collection("categories")
      .orderBy("name", "asc")
      .get();

    const items = qs.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/categories] GET failed:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}
