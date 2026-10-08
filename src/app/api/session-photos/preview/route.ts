export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { bucketAdmin } from "@/lib/firebase/admin";
import {
  verifySessionToken,
  checkSessionAccess,
  resolveMasterPath,
  ensurePreviewFile,
  sanitizeSessionId,
} from "@/lib/sessionPhotos";

/**
 * Serve os bytes da imagem de pré-visualização (ou do master, para admins)
 * diretamente, em vez de devolver um URL assinado do Storage. Isto impede
 * que a imagem fique acessível através de um link copiável/partilhável
 * fora da aplicação: cada pedido tem de incluir um Bearer token válido e é
 * revalidado contra as permissões da sessão em tempo real. No browser, o
 * cliente busca estes bytes via fetch() com o header Authorization e cria
 * um blob: URL local — que não funciona fora da sessão do browser onde foi
 * criado nem pode ser partilhado com outra pessoa.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = sanitizeSessionId(searchParams.get("sessionId") || "");
    const photoId = searchParams.get("photoId") || "";

    if (!sessionId || !photoId) {
      return NextResponse.json({ error: "invalid params" }, { status: 400 });
    }

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

    const masterPath = await resolveMasterPath(
      access.sessionRef,
      sessionId,
      photoId,
    );
    if (!masterPath) {
      return NextResponse.json({ error: "photo not found" }, { status: 404 });
    }

    let fileRef;
    if (auth.isAdmin) {
      // Admins veem sempre o ficheiro master em alta resolução.
      fileRef = bucketAdmin.file(masterPath);
    } else {
      // Não-admins recebem sempre a pré-visualização redimensionada e com
      // marca de água — nunca o master em alta resolução.
      const photoDocId = masterPath
        .split("/")
        .pop()!
        .replace(/\.[^.]+$/, "");
      const previewPath = await ensurePreviewFile(
        masterPath,
        sessionId,
        photoDocId,
      );
      fileRef = bucketAdmin.file(previewPath);
    }

    const [buffer] = await fileRef.download();
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
