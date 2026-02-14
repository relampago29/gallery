import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOC_PATH = "settings/site_info";

/**
 * GET /api/settings/site-info
 * Returns the full site info doc (admin only).
 */
export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const snap = await db.doc(DOC_PATH).get();
    const data = snap.exists ? snap.data() : {};

    return NextResponse.json({ data: data ?? {} });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/site-info
 * Saves/updates the site info document.
 * Body shape: { address, city, postalCode, country, mapEmbedUrl, mapLink,
 *               phone, email, hoursWeekdays, hoursSaturday, hoursSunday,
 *               instagram, facebook, tiktok, youtube, website }
 */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const fields = {
      // Address
      address: typeof body.address === "string" ? body.address.trim() : "",
      city: typeof body.city === "string" ? body.city.trim() : "",
      postalCode:
        typeof body.postalCode === "string" ? body.postalCode.trim() : "",
      country: typeof body.country === "string" ? body.country.trim() : "",
      mapEmbedUrl:
        typeof body.mapEmbedUrl === "string" ? body.mapEmbedUrl.trim() : "",
      mapLink: typeof body.mapLink === "string" ? body.mapLink.trim() : "",

      // Contact
      phone: typeof body.phone === "string" ? body.phone.trim() : "",
      email: typeof body.email === "string" ? body.email.trim() : "",

      // Hours
      hoursWeekdays:
        typeof body.hoursWeekdays === "string" ? body.hoursWeekdays.trim() : "",
      hoursSaturday:
        typeof body.hoursSaturday === "string" ? body.hoursSaturday.trim() : "",
      hoursSunday:
        typeof body.hoursSunday === "string" ? body.hoursSunday.trim() : "",

      // Social media
      instagram:
        typeof body.instagram === "string" ? body.instagram.trim() : "",
      facebook: typeof body.facebook === "string" ? body.facebook.trim() : "",
      tiktok: typeof body.tiktok === "string" ? body.tiktok.trim() : "",
      youtube: typeof body.youtube === "string" ? body.youtube.trim() : "",
      website: typeof body.website === "string" ? body.website.trim() : "",

      // Meta
      updatedAt: new Date().toISOString(),
      updatedBy: uid,
    };

    const db = getAdminDb();
    await db.doc(DOC_PATH).set(fields, { merge: true });

    return NextResponse.json({ ok: true, data: fields });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
