// server-only
import { NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase/admin";

export async function GET() {
  try {
    // Use configured bucket or default
    let bucketName = process.env.FIREBASE_STORAGE_BUCKET || undefined;
    if (bucketName && bucketName.includes("firebasestorage.app")) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (projectId) bucketName = `${projectId}.appspot.com`;
      else bucketName = undefined;
    }
    const storage = getAdminStorage();
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const [files] = await bucket.getFiles({ prefix: "gallery/" });
    const items = files
      .filter((f) => !f.name.endsWith("/"))
      .map((f) => ({ name: f.name.replace(/^gallery\//, ""), path: f.name }));
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "List failed" }, { status: 500 });
  }
}

