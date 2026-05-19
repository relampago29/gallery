export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";

/**
 * GET /api/sessions/my-sessions
 * Retorna todas as sessões onde o utilizador é owner ou está em allowedUsers.
 * Requer Bearer token (Firebase ID token).
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }

    const db = getAdminDb();

    // 1) Sessões onde o user é owner
    const ownerSnap = await db
      .collection("client_sessions")
      .where("ownerUid", "==", uid)
      .limit(100)
      .get();

    // 2) Sessões onde o user é guest (allowedUids array contains uid)
    const guestSnap = await db
      .collection("client_sessions")
      .where("allowedUids", "array-contains", uid)
      .limit(100)
      .get();

    const seen = new Set<string>();
    const sessions: {
      id: string;
      name: string;
      createdAt: number | null;
      role: "owner" | "guest";
      freeAccess: boolean;
      photoCount?: number;
    }[] = [];

    for (const doc of ownerSnap.docs) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      const data = doc.data() || {};
      const photosSnap = await doc.ref.collection("photos").count().get();
      sessions.push({
        id: doc.id,
        name: data.name || doc.id,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
        role: "owner",
        freeAccess: data.ownerFreeAccess === true,
        photoCount: photosSnap.data().count ?? 0,
      });
    }

    for (const doc of guestSnap.docs) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      const data = doc.data() || {};
      const guests = data.allowedUsers || {};
      const guestData = guests[uid] || {};
      const photosSnap = await doc.ref.collection("photos").count().get();
      sessions.push({
        id: doc.id,
        name: data.name || doc.id,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
        role: "guest",
        freeAccess: guestData.freeAccess === true,
        photoCount: photosSnap.data().count ?? 0,
      });
    }

    // Sort by createdAt descending (avoids composite index dependency)
    sessions.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
