import { getAdminDb, getAdminAuth, bucketAdmin } from "@/lib/firebase/admin";
import sharp from "sharp";
import { watermarkedJpeg } from "@/lib/watermark";

export const PREVIEW_MAX_WIDTH = 1280;
export const PREVIEW_QUALITY = 76;
const PREVIEW_DIR = "preview-v2";

export type AuthInfo = { uid: string; isAdmin: boolean };

/** Verifica o Bearer token do pedido e devolve { uid, isAdmin } ou null */
export async function verifySessionToken(
  req: Request,
): Promise<AuthInfo | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const isAdmin =
      (decoded as any)?.isAdmin === true ||
      (decoded as any)?.claims?.isAdmin === true;
    return { uid: decoded.uid, isAdmin };
  } catch {
    return null;
  }
}

export function sanitizeSessionId(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clampHours(input: number | null | undefined) {
  if (!input || Number.isNaN(input)) return 48;
  return Math.min(168, Math.max(1, input));
}

/**
 * Confirma se o utilizador autenticado pode aceder à sessão (admin, owner ou
 * guest convidado). Devolve os dados da sessão + se tem acesso gratuito, ou
 * null se a sessão não existir / acesso negado.
 */
export async function checkSessionAccess(sessionId: string, auth: AuthInfo) {
  const db = getAdminDb();
  const sessionRef = db.collection("client_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return null;

  const sessionData = sessionSnap.data() || {};

  if (!auth.isAdmin) {
    const isOwner = sessionData.ownerUid === auth.uid;
    const allowedUids: string[] = Array.isArray(sessionData.allowedUids)
      ? sessionData.allowedUids
      : [];
    const isGuest = allowedUids.includes(auth.uid);
    if (!isOwner && !isGuest) {
      return { sessionRef, sessionData, allowed: false, freeAccess: false };
    }
  }

  let freeAccess = false;
  if (auth.isAdmin) {
    freeAccess = true;
  } else if (sessionData.ownerUid === auth.uid) {
    freeAccess = sessionData.ownerFreeAccess === true;
  } else {
    const guests = sessionData.allowedUsers || {};
    freeAccess = guests[auth.uid]?.freeAccess === true;
  }

  return { sessionRef, sessionData, allowed: true, freeAccess };
}

/**
 * Resolve o masterPath de uma foto da sessão a partir do photoId (id do
 * documento Firestore) ou, em fallback, de um caminho direto no Storage
 * (usado quando não existem documentos Firestore e as fotos são lidas
 * diretamente da pasta masters/sessions/{sessionId}/).
 */
export async function resolveMasterPath(
  sessionRef: FirebaseFirestore.DocumentReference,
  sessionId: string,
  photoId: string,
): Promise<string | null> {
  const photoDoc = await sessionRef.collection("photos").doc(photoId).get();
  if (photoDoc.exists) {
    const masterPath = photoDoc.data()?.masterPath as string | undefined;
    if (masterPath) return masterPath;
  }

  // Fallback: photoId pode já ser o caminho completo no Storage (usado pelo
  // modo de fallback do endpoint /list quando não há documentos Firestore).
  const prefix = `masters/sessions/${sessionId}/`;
  if (photoId.startsWith(prefix)) return photoId;

  // Última tentativa: procurar um ficheiro cujo nome (sem extensão) coincida.
  const [files] = await bucketAdmin.getFiles({ prefix });
  const match = files.find((f) => {
    const fileName = f.name.split("/").pop() || f.name;
    return fileName.replace(/\.[^.]+$/, "") === photoId || f.name === photoId;
  });
  return match ? match.name : null;
}

/**
 * Garante que existe uma pré-visualização redimensionada (1280px) e com
 * marca de água em cache no Storage para o masterPath indicado. Usa a MESMA
 * marca de água do resto do site (`@/lib/watermark`). Devolve o caminho do
 * ficheiro de preview (reaproveitado em chamadas seguintes).
 */
export async function ensurePreviewFile(
  masterPath: string,
  sessionId: string,
  photoId: string,
): Promise<string> {
  // "preview-v2": as previews antigas (marca de água SVG) são regeneradas.
  const previewPath = `variants/sessions/${sessionId}/${PREVIEW_DIR}/${photoId}.jpg`;
  const previewFile = bucketAdmin.file(previewPath);

  const [exists] = await previewFile.exists().catch(() => [false]);
  if (!exists) {
    const [masterBuffer] = await bucketAdmin.file(masterPath).download();
    const watermarked = await watermarkedJpeg(
      sharp,
      masterBuffer,
      PREVIEW_MAX_WIDTH,
      PREVIEW_QUALITY,
    );

    await previewFile.save(watermarked, {
      resumable: false,
      contentType: "image/jpeg",
      metadata: { cacheControl: "private,no-store" },
    });
  }

  return previewPath;
}
