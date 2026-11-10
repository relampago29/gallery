import { NextResponse } from "next/server";
import { requireAdmin } from "../../session-orders/helpers";
import { savePublicImage, type PublicImageKind } from "@/lib/publicImages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/highlights/upload
 * Upload de uma imagem para os destaques da homepage ou para o trail do rato
 * (campo `kind`: "highlights" | "trail"). O original fica privado e o URL
 * devolvido é o da cópia com marca de água.
 */
export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const originalName = (form.get("name") as string) || (file as any)?.name || "highlight";
    const kind: PublicImageKind = form.get("kind") === "trail" ? "trail" : "highlights";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "invalid type" }, { status: 415 });
    }

    const saved = await savePublicImage({
      kind,
      buffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      originalName,
    });

    return NextResponse.json({ ok: true, ...saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
