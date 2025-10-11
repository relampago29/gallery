// server-only
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const snapshot = await adminDb.collection("users").limit(10).get();
  const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ users });
}
