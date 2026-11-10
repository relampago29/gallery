import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { deletePublicImageByUrl } from "@/lib/publicImages";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    await deletePublicImageByUrl(imageUrl);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
