import { getAdminDb, getAdminAuth, bucketAdmin } from "@/lib/firebase/admin";
import sharp from "sharp";

export const PREVIEW_MAX_WIDTH = 1280;
export const PREVIEW_QUALITY = 76;
export const WATERMARK_LABEL = "MOMENTOS.WORK · PRÉ-VISUALIZAÇÃO";

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

/** Constrói um SVG com o texto da marca de água repetido na diagonal */
function buildWatermarkSvg(width: number, height: number) {
  const tiles: string[] = [];
  const spacingX = 340;
  const spacingY = 150;
  for (let y = -spacingY; y < height + spacingY; y += spacingY) {
    for (let x = -spacingX; x < width + spacingX; x += spacingX) {
      tiles.push(
        `<text x="${x}" y="${y}" transform="rotate(-28 ${x} ${y})" font-size="26" font-family="sans-serif" font-weight="600" fill="#ffffff" fill-opacity="0.24">${WATERMARK_LABEL}</text>`,
      );
    }
  }
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${tiles.join("")}</svg>`;
}

/**
 * Garante que existe uma pré-visualização redimensionada (1280px) e com
 * marca de água em cache no Storage para o masterPath indicado. Devolve o
 * caminho do ficheiro de preview (sempre o mesmo, reaproveitado em
 * chamadas seguintes).
 */
export async function ensurePreviewFile(
  masterPath: string,
  sessionId: string,
  photoId: string,
): Promise<string> {
  const previewPath = `variants/sessions/${sessionId}/preview/${photoId}.jpg`;
  const previewFile = bucketAdmin.file(previewPath);

  const [exists] = await previewFile.exists().catch(() => [false]);
  if (!exists) {
    const [masterBuffer] = await bucketAdmin.file(masterPath).download();
    const resized = await sharp(masterBuffer)
      .rotate()
      .resize({ width: PREVIEW_MAX_WIDTH, withoutEnlargement: true })
      .toBuffer();
    const meta = await sharp(resized).metadata();
    const width = meta.width || PREVIEW_MAX_WIDTH;
    const height = meta.height || PREVIEW_MAX_WIDTH;
    const watermarkSvg = buildWatermarkSvg(width, height);
    const watermarked = await sharp(resized)
      .composite([{ input: Buffer.from(watermarkSvg) }])
      .jpeg({ quality: PREVIEW_QUALITY })
      .toBuffer();

    await previewFile.save(watermarked, {
      resumable: false,
      contentType: "image/jpeg",
      metadata: { cacheControl: "private,no-store" },
    });
  }

  return previewPath;
}
