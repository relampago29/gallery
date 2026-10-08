export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { bucketAdmin } from "@/lib/firebase/admin";
import {
  verifySessionToken,
  checkSessionAccess,
  sanitizeSessionId,
  clampHours,
} from "@/lib/sessionPhotos";

type SessionPhoto = {
  id: string;
  title?: string | null;
  url: string;
  downloadUrl: string;
  createdAt?: number;
};

/**
 * Para utilizadores não-admin, o `url` devolvido NUNCA é um link direto
 * (assinado) para o Storage — é sempre um endpoint proxy da nossa própria
 * API que exige um Bearer token válido em cada pedido e revalida as
 * permissões em tempo real. Isto impede que a imagem fique acessível por
 * um link copiável/partilhável fora do fluxo normal da aplicação (ex:
 * "copiar endereço da imagem" e abrir noutro browser/dispositivo). Os
 * admins continuam a receber um URL assinado direto ao master.
 */
function buildPreviewUrl(sessionId: string, photoId: string) {
  return `/api/session-photos/preview?sessionId=${encodeURIComponent(sessionId)}&photoId=${encodeURIComponent(photoId)}`;
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

    // Auth: requer utilizador autenticado (owner, guest ou admin)
    const auth = await verifySessionToken(req);
    if (!auth) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const access = await checkSessionAccess(sessionId, auth);
    if (!access) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }
    if (!access.allowed) {
      return NextResponse.json({ error: "access denied" }, { status: 403 });
    }

    const { sessionRef, sessionData, freeAccess: userFreeAccess } = access;
    const sessionName = sessionData.name as string | undefined;
    const expiresAt = Date.now() + hours * 60 * 60 * 1000;

    const photosSnap = await sessionRef
      .collection("photos")
      .orderBy("createdAt", "asc")
      .get();
    const files: SessionPhoto[] = [];

    await Promise.all(
      photosSnap.docs.map(async (doc) => {
        const data = doc.data() || {};
        const masterPath = data.masterPath as string | undefined;
        if (!masterPath) return;
        try {
          // Utilizadores não-admin só veem uma pré-visualização redimensionada
          // e com marca de água — nunca o ficheiro master em alta resolução,
          // servida sempre via proxy autenticado (nunca um link direto).
          const url = auth.isAdmin
            ? (
                await bucketAdmin.file(masterPath).getSignedUrl({
                  action: "read",
                  expires: expiresAt,
                })
              )[0]
            : buildPreviewUrl(sessionId, doc.id);
          if (!url) return;
          const downloadUrl = `/api/session-photos/download?path=${encodeURIComponent(masterPath)}&name=${encodeURIComponent(
            data.title || doc.id,
          )}`;
          files.push({
            id: doc.id,
            title: data.title || data.alt || masterPath.split("/").pop(),
            url,
            downloadUrl,
            createdAt:
              typeof data.createdAt === "number" ? data.createdAt : undefined,
          });
        } catch {
          // ignore errors for missing files
        }
      }),
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
                const fileName = file.name.split("/").pop() || file.name;
                const photoId = fileName.replace(/\.[^.]+$/, "");
                const url = auth.isAdmin
                  ? (
                      await file.getSignedUrl({
                        action: "read",
                        expires: expiresAt,
                      })
                    )[0]
                  : buildPreviewUrl(sessionId, photoId);
                if (!url) return;
                files.push({
                  id: file.name,
                  title: file.name.slice(prefix.length) || file.name,
                  url,
                  downloadUrl: `/api/session-photos/download?path=${encodeURIComponent(file.name)}&name=${encodeURIComponent(
                    file.name.split("/").pop() || file.name,
                  )}`,
                  createdAt: file.metadata?.timeCreated
                    ? Date.parse(file.metadata.timeCreated)
                    : undefined,
                });
              } catch {
                // ignore fallback errors
              }
            }),
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
      freeAccess: userFreeAccess,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
