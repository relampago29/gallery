export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminBucket } from "@/lib/firebase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const path = searchParams.get("path");
    const hours = Number(searchParams.get("hours") || 24);

    if (!path) {
      return NextResponse.json({ error: "missing path" }, { status: 400 });
    }

    if (!path.startsWith("masters/sessions/")) {
      return NextResponse.json({ error: "path not allowed" }, { status: 400 });
    }

    // Obter bucket admin corretamente
    const bucket = getAdminBucket();
    const file = bucket.file(path);

    // Calcula validade (entre 1h e 168h = 7 dias)
    const expiresAt =
      Date.now() +
      Math.max(1, Math.min(168, hours)) * 60 * 60 * 1000;

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: expiresAt,
    });

    return NextResponse.json(
      {
        url,
        expiresAt,
        bucket: bucket.name,
        path,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}
