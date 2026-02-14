import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOC_PATH = "settings/site_info";

/**
 * GET /api/settings/site-info/public
 * Returns site info for public pages (no auth required).
 * Strips internal fields (updatedBy).
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.doc(DOC_PATH).get();

    if (!snap.exists) {
      return NextResponse.json({ data: {} });
    }

    const raw = snap.data() ?? {};

    // Strip internal fields
    const { updatedBy, ...publicData } = raw;

    return NextResponse.json({ data: publicData });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error", data: {} },
      { status: 500 }
    );
  }
}
