// server-only
import { NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let folder = searchParams.get("folder") || "default";
    folder = folder.replace(/[^A-Za-z0-9_-]/g, "-");
    // Use configured bucket or default
    let bucketName = process.env.FIREBASE_STORAGE_BUCKET || undefined;
    if (bucketName && bucketName.includes("firebasestorage.app")) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (projectId) bucketName = `${projectId}.appspot.com`;
      else bucketName = undefined;
    }
    const storage = getAdminStorage();
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();

    const prefix = `uploads/${folder}/`;
    let files;
    try {
      [files] = await bucket.getFiles({ prefix });
    } catch (e) {
      // If listing fails for a missing prefix, create a placeholder and return empty
      try {
        const keep = bucket.file(`${prefix}.keep`);
        await keep.save(Buffer.alloc(0), { resumable: false, metadata: { contentType: "text/plain" } });
      } catch {}
      return NextResponse.json({ items: [] });
    }

    // If folder is empty, ensure it exists by creating a hidden placeholder once
    if (!files?.length) {
      try {
        const keep = bucket.file(`${prefix}.keep`);
        await keep.save(Buffer.alloc(0), { resumable: false, metadata: { contentType: "text/plain" } });
      } catch {}
    }

    const items = (files || [])
      .filter((f) => !f.name.endsWith("/") && f.name !== `${prefix}.keep` && !f.name.endsWith("/.keep"))
      .map((f) => ({ name: f.name.replace(new RegExp(`^${prefix}`), ""), path: f.name }));
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "List failed" }, { status: 500 });
  }
}

