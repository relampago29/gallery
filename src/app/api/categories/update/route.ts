export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { id, patch } = await req.json() as { id?: string; patch?: Record<string, any> };
    if (!id || !patch || typeof patch !== "object") {
      return NextResponse.json({ error: "missing id/patch" }, { status: 400 });
    }
    await firestoreAdmin.collection("categories").doc(id).update({
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
