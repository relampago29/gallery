// server-only
import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    let bucketName = process.env.FIREBASE_STORAGE_BUCKET || undefined;
    if (bucketName && bucketName.includes("firebasestorage.app")) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (projectId) bucketName = `${projectId}.appspot.com`;
      else bucketName = undefined;
    }

    const storage = getAdminStorage();
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const file = bucket.file(`gallery/${name}`);
    await file.delete({ ignoreNotFound: true });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}

