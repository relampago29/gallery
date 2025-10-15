// server-only
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET() {
  const snapshot = await getAdminDb().collection("users").limit(10).get();
  const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ users });
}
