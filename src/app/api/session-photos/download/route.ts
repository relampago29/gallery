export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminBucket } from "@/lib/firebase/admin";

// Evita directory traversal
function sanitizePath(path: string) {
  return path.replace(/(\.\.)+/g, "").replace(/^\/+/, "");
}

// Normaliza nome de ficheiro
function sanitizeFilename(name: string) {
  return (
    name
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "foto.jpg"
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawPath = searchParams.get("path") || "";
    const rawName = searchParams.get("name") || "";

    const path = sanitizePath(rawPath);

    // Segurança mínima: apenas ficheiros dentro da pasta esperada
    if (!path || !path.startsWith("masters/sessions/")) {
      return NextResponse.json({ error: "invalid path" }, { status: 400 });
    }

    const filename = sanitizeFilename(
      rawName || path.split("/").pop() || "foto.jpg"
    );

    // Obtemos o bucket admin corretamente
    const bucket = getAdminBucket();
    const file = bucket.file(path);

    const [metadata] =
      (await file
        .getMetadata()
        .catch(() => [
          { contentType: "application/octet-stream", size: "0" } as any,
        ])) || [];

    const [buffer] = await file.download();
    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      headers: {
        "Content-Type": metadata?.contentType || "application/octet-stream",
        "Content-Length": String(body.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "download failed" },
      { status: 500 }
    );
  }
}
