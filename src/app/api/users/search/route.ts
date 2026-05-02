import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/users/search?q=partial_email
 * Returns up to 8 users whose email starts with (or contains) the query.
 * Only accessible by admins.
 */
export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const results: { uid: string; email: string; displayName: string | null }[] =
      [];
    let pageToken: string | undefined;

    // Iterate pages (1000 users each) until we have 8 matches or exhausted
    do {
      const { users, pageToken: next } = await getAdminAuth().listUsers(
        1000,
        pageToken,
      );
      for (const u of users) {
        if (!u.email) continue;
        if (u.email.toLowerCase().includes(q)) {
          results.push({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName ?? null,
          });
          if (results.length >= 8) break;
        }
      }
      pageToken = next;
    } while (pageToken && results.length < 8);

    return NextResponse.json({ users: results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
