import { randomUUID } from "crypto";
import sharp from "sharp";
import { bucketAdmin } from "@/lib/firebase/admin";
import { watermarkedJpeg } from "@/lib/watermark";

/**
 * Imagens públicas avulsas (destaques da homepage, trail do rato, capas de
 * eventos e de categorias) seguem a MESMA regra que o portfólio, as fotos de
 * eventos e as previews das sessões privadas:
 *
 *  - o original (master) fica em `masters/<kind>/…`, privado e SEM token de
 *    download;
 *  - o site só recebe uma cópia redimensionada com a marca de água única
 *    (`@/lib/watermark`), em `variants/<kind>/…`.
 */
export type PublicImageKind = "highlights" | "trail" | "event-covers" | "categories";

const MASTER_PREFIX: Record<PublicImageKind, string> = {
  highlights: "masters/highlights",
  trail: "masters/trail",
  "event-covers": "masters/events/covers",
  categories: "masters/categories",
};

const VARIANT_PREFIX: Record<PublicImageKind, string> = {
  highlights: "variants/highlights",
  trail: "variants/trail",
  "event-covers": "variants/events/covers",
  categories: "variants/categories",
};

export function makeDownloadUrl(bucketName: string, path: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    path,
  )}?alt=media&token=${token}`;
}

export function extFromNameOrMime(name?: string | null, mime?: string | null) {
  if (name && name.includes(".")) return name.split(".").pop()!.toLowerCase();
  if (!mime) return "jpg";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("avif")) return "avif";
  return "jpg";
}

export type SavedPublicImage = {
  /** URL público da cópia com marca de água (é isto que vai para o Firestore). */
  imageUrl: string;
  /** Caminho da variante pública. */
  path: string;
  /** Caminho do original privado. */
  masterPath: string;
};

/**
 * Guarda o original em privado e publica apenas a versão com marca de água.
 * `id` permite reaproveitar um id (p.ex. o da categoria); por omissão é um UUID.
 */
export async function savePublicImage(opts: {
  kind: PublicImageKind;
  buffer: Buffer;
  contentType?: string | null;
  originalName?: string | null;
  id?: string;
}): Promise<SavedPublicImage> {
  const id = opts.id || randomUUID();
  const ext = extFromNameOrMime(opts.originalName, opts.contentType);
  const masterPath = `${MASTER_PREFIX[opts.kind]}/${id}.${ext}`;
  const path = `${VARIANT_PREFIX[opts.kind]}/${id}.jpg`;

  await bucketAdmin.file(masterPath).save(opts.buffer, {
    resumable: false,
    contentType: opts.contentType || "application/octet-stream",
    metadata: { cacheControl: "private,no-store" },
  });

  const watermarked = await watermarkedJpeg(sharp, opts.buffer);
  const token = randomUUID();
  await bucketAdmin.file(path).save(watermarked, {
    resumable: false,
    contentType: "image/jpeg",
    metadata: {
      // Cache curto: o mesmo caminho pode ser reescrito (capa de categoria).
      cacheControl: "public,max-age=3600",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return { imageUrl: makeDownloadUrl(bucketAdmin.name, path, token), path, masterPath };
}

/** Extrai o caminho no Storage de um URL do Firebase Storage (ou null). */
export function storagePathFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/b\/([^/]+)\/o\/([^?]+)/);
    if (!match || match[1] !== bucketAdmin.name) return null;
    return decodeURIComponent(match[2]);
  } catch {
    return null;
  }
}

/**
 * Apaga a imagem pública e o respetivo master a partir do URL guardado no
 * Firestore. Aceita URLs antigos (que apontavam diretamente para o master).
 */
export async function deletePublicImageByUrl(url?: string | null) {
  const path = storagePathFromUrl(url);
  if (!path) return;
  const targets = new Set<string>();
  if (path.startsWith("masters/")) {
    // URL antigo que apontava para o master: só apaga nos prefixos destas imagens.
    if (Object.values(MASTER_PREFIX).some((pre) => path.startsWith(`${pre}/`))) {
      targets.add(path);
    }
  } else {
    for (const kind of Object.keys(VARIANT_PREFIX) as PublicImageKind[]) {
      const prefix = `${VARIANT_PREFIX[kind]}/`;
      if (!path.startsWith(prefix)) continue;
      targets.add(path);
      const id = path.slice(prefix.length).replace(/\.jpg$/, "");
      const [masters] = await bucketAdmin.getFiles({ prefix: `${MASTER_PREFIX[kind]}/${id}.` });
      masters.forEach((f) => targets.add(f.name));
    }
  }
  await Promise.all(
    Array.from(targets).map((p) =>
      bucketAdmin
        .file(p)
        .delete({ ignoreNotFound: true })
        .catch((err) => console.error("[publicImages] delete failed", p, err)),
    ),
  );
}
