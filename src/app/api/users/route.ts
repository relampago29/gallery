import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { requireAdmin } from "../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PAGE_SIZE = 5;

export async function GET(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const pageToken = url.searchParams.get("pageToken") || undefined;
    const metaOnly = url.searchParams.get("metaOnly") === "1" || url.searchParams.get("metaOnly") === "true";
    const { users, pageToken: nextPageToken } = await getAdminAuth().listUsers(PAGE_SIZE, pageToken);

    const mapped = metaOnly
      ? []
      : users.map((u) => ({
          uid: u.uid,
          email: u.email ?? null,
          displayName: u.displayName ?? null,
          provider: u.providerData?.[0]?.providerId ?? null,
          emailVerified: !!u.emailVerified,
          disabled: !!u.disabled,
          createdAt: u.metadata?.creationTime ? new Date(u.metadata.creationTime).toISOString() : null,
          lastLoginAt: u.metadata?.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
        }));

    return NextResponse.json({ users: mapped, nextPageToken: nextPageToken ?? null, pageSize: PAGE_SIZE });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
