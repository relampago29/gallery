import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("highlights").orderBy("order", "asc").limit(12).get();

    const items = snap.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return { id: doc.id, ...data } as { id: string; order?: number; createdAt?: number; [key: string]: unknown };
      })
      .sort((a, b) => {
        const orderA = typeof a.order === "number" ? a.order : 0;
        const orderB = typeof b.order === "number" ? b.order : 0;
        if (orderA !== orderB) return orderA - orderB;
        const createdA = typeof a.createdAt === "number" ? a.createdAt : 0;
        const createdB = typeof b.createdAt === "number" ? b.createdAt : 0;
        return createdA - createdB;
      });
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
