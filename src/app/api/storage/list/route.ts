// gallery/src/app/api/storage/list/route.ts
// Endpoint de manutenção para listar ficheiros no Storage
// Útil para inspeção de masters/variants conforme o fluxo atual.
// ⚠️ Recomendado proteger com auth/claims de admin no futuro.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase/admin";

type Scope = "public" | "session";
type Kind = "masters" | "variants";

function sanitizeSegment(s: string) {
  // evita traversal e caracteres estranhos
  return s.replace(/[^A-Za-z0-9/_-]/g, "-").replace(/(\.\.)+/g, "-");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Parâmetros:
    // scope=public | session
    // kind=masters | variants
    // sessionId=... (obrigatório se scope=session)
    // prefix=<extra/opcional> (ex.: filtrar por photoId)
    const scope = (searchParams.get("scope") || "public") as Scope;
    const kind = (searchParams.get("kind") || "masters") as Kind;
    const rawPrefix = searchParams.get("prefix") || "";

    if (!["public", "session"].includes(scope)) {
      return NextResponse.json({ error: "invalid scope" }, { status: 400 });
    }
    if (!["masters", "variants"].includes(kind)) {
      return NextResponse.json({ error: "invalid kind" }, { status: 400 });
    }

    let basePrefix = "";
    if (scope === "public") {
      basePrefix = kind === "masters" ? "masters/public/" : "variants/public/";
    } else {
      const sessionId = searchParams.get("sessionId");
      if (!sessionId) {
        return NextResponse.json({ error: "missing sessionId for scope=session" }, { status: 400 });
      }
      const safeSession = sanitizeSegment(sessionId);
      basePrefix =
        kind === "masters"
          ? `masters/sessions/${safeSession}/`
          : `variants/sessions/${safeSession}/`;
    }

    const extra = sanitizeSegment(rawPrefix);
    const prefix = extra ? `${basePrefix}${extra}` : basePrefix;

    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix });

    const items = (files || [])
      .filter((f) => !f.name.endsWith("/"))
      .map((f) => ({
        name: f.name.substring(prefix.length),
        path: f.name,
        size: f.metadata?.size ? Number(f.metadata.size) : undefined,
        contentType: f.metadata?.contentType,
        updated: f.metadata?.updated,
      }));

    return NextResponse.json({
      scope,
      kind,
      prefix,
      count: items.length,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "list failed" }, { status: 500 });
  }
}
