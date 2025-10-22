// server-only
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminStorage } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const form = await req.formData();
    const file = form.get("file");
    const name = (form.get("name") as string) || "upload.bin";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || "application/octet-stream";

    const path = `uploads/${uid}/${name}`;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    const bucket = bucketName
      ? getAdminStorage().bucket(bucketName)
      : getAdminStorage().bucket();
    const gcsFile = bucket.file(path);

    await gcsFile.save(buffer, {
      contentType,
      resumable: false,
      metadata: { contentType },
    });

    return NextResponse.json({ path });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
