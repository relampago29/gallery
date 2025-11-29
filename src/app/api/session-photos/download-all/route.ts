export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { bucketAdmin, getAdminDb } from "@/lib/firebase/admin";
import { buildZipFromSources, sanitizeFilename } from "@/lib/storage/zip";

function sanitizeSessionId(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getSessionFileEntries(sessionId: string) {
  const db = getAdminDb();
  const sessionRef = db.collection("client_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();

  const entries: { name: string; path: string; createdAt?: number }[] = [];
  const photosSnap = await sessionRef.collection("photos").orderBy("createdAt", "asc").get();
  photosSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.masterPath) {
      entries.push({
        name: data.title || data.alt || doc.id,
        path: data.masterPath as string,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
      });
    }
  });

  if (!entries.length) {
    const prefix = `masters/sessions/${sessionId}/`;
    const [objects] = await bucketAdmin.getFiles({ prefix });
    objects
      .filter((f) => f.name !== prefix && !f.name.endsWith("/"))
      .forEach((file) => {
        entries.push({
          name: file.name.slice(prefix.length),
          path: file.name,
          createdAt: file.metadata?.timeCreated ? Date.parse(file.metadata.timeCreated) : undefined,
        });
      });
  }

  if (!entries.length) {
    return [];
  }

  const usedNames = new Map<string, number>();
  const buffers: { filename: string; data: Buffer; createdAt?: number }[] = [];
  for (const entry of entries) {
    const file = bucketAdmin.file(entry.path);
    const [data] = await file.download();
    const rawName = sanitizeFilename(entry.name || entry.path.split("/").pop() || "foto");
    const ext = entry.path.includes(".") ? entry.path.split(".").pop() || "jpg" : "jpg";
    let finalName = rawName.toLowerCase().endsWith(`.${ext}`) ? rawName : `${rawName}.${ext}`;
    if (usedNames.has(finalName)) {
      const count = usedNames.get(finalName)! + 1;
      usedNames.set(finalName, count);
      const base = finalName.replace(/\.[^.]+$/, "");
      finalName = `${base}-${count}.${ext}`;
    } else {
      usedNames.set(finalName, 0);
    }
    buffers.push({
      filename: finalName,
      data,
      createdAt: entry.createdAt,
    });
  }
  return buffers;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSession = searchParams.get("sessionId") || "";
    const sessionId = sanitizeSessionId(rawSession);
    if (!sessionId) {
      return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
    }

    const entries = await getSessionFileEntries(sessionId);
    if (!entries.length) {
      return NextResponse.json({ error: "sem ficheiros para esta sessão" }, { status: 404 });
    }

    const zipBuffer = buildZipFromSources(entries);
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${sessionId || "sessao"}.zip"`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "download all failed" }, { status: 500 });
  }
}
