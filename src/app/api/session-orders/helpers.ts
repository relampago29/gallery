import { getAdminAuth } from "@/lib/firebase/admin";

export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const isAdmin =
      (decoded as any)?.isAdmin === true ||
      (decoded as any)?.claims?.isAdmin === true ||
      (decoded as any)?.["https://hasura.io/jwt/claims"]?.["x-hasura-default-role"] === "admin";
    if (!isAdmin) return null;
    return decoded.uid;
  } catch (err) {
    console.error("[requireAdmin] token verification failed", err);
    return null;
  }
}
