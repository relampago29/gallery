import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export type AdminAuthResult =
  | { ok: true; uid: string }
  | { ok: false; response: NextResponse };

function isAdminClaims(decoded: Record<string, any>) {
  return decoded?.isAdmin === true || decoded?.claims?.isAdmin === true;
}

/**
 * Valida o Bearer token (Firebase ID token) do pedido e exige o claim
 * `isAdmin`. Devolve `{ ok: true, uid }` ou `{ ok: false, response }` com o
 * 401/403 já pronto a devolver pela route.
 *
 * Uso:
 *   const admin = await requireAdminRequest(req);
 *   if (!admin.ok) return admin.response;
 */
export async function requireAdminRequest(req: Request): Promise<AdminAuthResult> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!isAdminClaims(decoded as Record<string, any>)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
      };
    }
    return { ok: true, uid: decoded.uid };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid token" }, { status: 401 }),
    };
  }
}
