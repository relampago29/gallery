import { NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase/admin";
import { randomUUID } from "crypto";
import { Readable } from "node:stream";
import { requireAdmin } from "../../session-orders/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extFromNameOrMime(name?: string | null, mime?: string | null) {
  if (name && name.includes(".")) return name.split(".").pop()!.toLowerCase();
  if (!mime) return "jpg";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("avif")) return "avif";
  return "jpg";
}

function makeDownloadUrl(bucketName: string, path: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

export async function POST(req: Request) {
  try {
    const uid = await requireAdmin(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const originalName = (form.get("name") as string) || (file as any)?.name || "highlight";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "invalid type" }, { status: 415 });
    }

    const ext = extFromNameOrMime(originalName, file.type);
    const safeBase = originalName.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const storagePath = `masters/highlights/${randomUUID()}-${safeBase}`.replace(/\.+/g, ".") + (safeBase.endsWith(`.${ext}`) ? "" : `.${ext}`);

    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const token = randomUUID();

    const inputStream =
      typeof (file as any).stream === "function" && typeof Readable.fromWeb === "function"
        ? Readable.fromWeb((file as any).stream())
        : Readable.from(Buffer.from(await file.arrayBuffer()));

    await new Promise<void>((resolve, reject) => {
      const writeStream = bucket.file(storagePath).createWriteStream({
        resumable: true,
        contentType: file.type || "application/octet-stream",
        metadata: {
          contentType: file.type || "application/octet-stream",
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);
      inputStream.on("error", reject);
      inputStream.pipe(writeStream);
    });

    const imageUrl = makeDownloadUrl(bucket.name, storagePath, token);

    return NextResponse.json({ ok: true, imageUrl, path: storagePath }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
