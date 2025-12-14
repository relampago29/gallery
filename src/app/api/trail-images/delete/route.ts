import { NextResponse } from "next/server";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseStoragePath(url: string | undefined | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("firebasestorage.googleapis.com")) return null;
    const match = u.pathname.match(/\/b\/([^/]+)\/o\/([^?]+)/);
    if (!match) return null;
    const bucket = match[1];
    const path = decodeURIComponent(match[2]);
    return { bucket, path };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection("trail_images").doc(id);
    const snap = await docRef.get();
    const imageUrl = snap.exists ? (snap.data()?.imageUrl as string | undefined) : undefined;

    await docRef.delete();

    if (imageUrl) {
      const parsed = parseStoragePath(imageUrl);
      const storage = getAdminStorage();
      const bucket = storage.bucket();
      if (parsed && parsed.bucket === bucket.name && parsed.path.startsWith("masters/")) {
        try {
          await bucket.file(parsed.path).delete({ ignoreNotFound: true });
        } catch (err) {
          console.error("[trail-images/delete] failed to delete storage file", parsed.path, err);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
