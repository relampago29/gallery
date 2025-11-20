export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb, bucketAdmin } from "@/lib/firebase/admin";

type SessionPhoto = {
  id: string;
  title?: string | null;
  url: string;
  downloadUrl: string;
  createdAt?: number;
};

function sanitizeSessionId(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampHours(input: number | null | undefined) {
  if (!input || Number.isNaN(input)) return 48;
  return Math.min(168, Math.max(1, input));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSession = searchParams.get("sessionId") || "";
    const hoursParam = Number(searchParams.get("hours"));
    const hours = clampHours(hoursParam);
    const sessionId = sanitizeSessionId(rawSession);

    if (!sessionId) {
      return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
    }

    const expiresAt = Date.now() + hours * 60 * 60 * 1000;
    const db = getAdminDb();
    const sessionRef = db.collection("client_sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    const sessionName = sessionSnap.exists ? (sessionSnap.data()?.name as string | undefined) : undefined;

    const photosSnap = await sessionRef.collection("photos").orderBy("createdAt", "asc").get();
    const files: SessionPhoto[] = [];

    await Promise.all(
      photosSnap.docs.map(async (doc) => {
        const data = doc.data() || {};
        const masterPath = data.masterPath as string | undefined;
        if (!masterPath) return;
        try {
          const [url] = await bucketAdmin.file(masterPath).getSignedUrl({
            action: "read",
            expires: expiresAt,
          });
          const downloadUrl = `/api/session-photos/download?path=${encodeURIComponent(masterPath)}&name=${encodeURIComponent(
            data.title || doc.id
          )}`;
          files.push({
            id: doc.id,
            title: data.title || data.alt || masterPath.split("/").pop(),
            url,
            downloadUrl,
            createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
          });
        } catch {
          // ignore errors for missing files
        }
      })
    );

    if (!files.length) {
      const prefix = `masters/sessions/${sessionId}/`;
      try {
        const [objects] = await bucketAdmin.getFiles({ prefix });
        await Promise.all(
          (objects || [])
            .filter((f) => f.name !== prefix && !f.name.endsWith("/"))
            .map(async (file) => {
              try {
                const [url] = await bucketAdmin.file(file.name).getSignedUrl({
                  action: "read",
                  expires: expiresAt,
                });
                files.push({
                  id: file.name,
                  title: file.name.slice(prefix.length) || file.name,
                  url,
                  downloadUrl: `/api/session-photos/download?path=${encodeURIComponent(file.name)}&name=${encodeURIComponent(
                    file.name.split("/").pop() || file.name
                  )}`,
                  createdAt: file.metadata?.timeCreated ? Date.parse(file.metadata.timeCreated) : undefined,
                });
              } catch {
                // ignore fallback errors
              }
            })
        );
      } catch {
        // ignore fallback errors
      }
    }

    return NextResponse.json({
      sessionId,
      sessionName: sessionName || sessionId,
      files,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
