import { db, storage } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  DocumentData,
} from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";

/* ----------------------------- Tipos & helpers ----------------------------- */

export type PublicPhotoSizes = {
  [width: string]: {
    jpg: string;
    webp?: string;
    avif?: string;
    width: number;
    height: number;
  };
};

export type PublicPhoto = {
  id: string;
  title?: string | null;
  alt?: string | null;
  categoryId: string;
  createdAt: number; // epoch ms
  published?: boolean;
  status?: "processing" | "ready" | "error";
  masterPath?: string;
  sizes?: PublicPhotoSizes;
  lqip?: { blurDataURL?: string; dominant?: string };
};

const MAX_UPLOAD_RETRIES = 3;
const MAX_DOC_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(fn: () => Promise<T>, attempts: number, baseDelayMs: number): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1) break;
      await sleep(baseDelayMs * Math.pow(2, i));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function uploadWithRetry(path: string, file: File) {
  const contentType = file.type || "application/octet-stream";
  await retry(
    () =>
      new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, path), file, { contentType });
        task.on("state_changed", undefined, reject, () => resolve());
      }),
    MAX_UPLOAD_RETRIES,
    BASE_RETRY_DELAY_MS
  );
}

async function postJsonWithRetry(url: string, payload: any) {
  return retry(
    async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      return res;
    },
    MAX_DOC_RETRIES,
    BASE_RETRY_DELAY_MS
  );
}

export function pickThumb(
  p: PublicPhoto
): { src?: string; w?: number; h?: number } {
  const sizes = p.sizes || {};
  const pref =
    sizes["960"] || sizes["800"] || sizes["640"] || Object.values(sizes)[0];
  if (pref?.jpg) return { src: pref.jpg, w: pref.width, h: pref.height };
  return {};
}

/* ------------------------------ Listagem (admin-first via API) ------------------------------ */

type PageInput = {
  limitN: number;
  categoryId?: string | null;
  cursor?: number | null; // usa createdAt como cursor
  forceApi?: boolean; // quando true, não faz fallback para Firestore client
};

/**
 * Lista fotos do portfólio.
 * - No admin, tentamos primeiro a **API server** (Admin SDK), que devolve também "processing".
 * - Se a API falhar, faz fallback para o **Firestore client** (regras devem permitir read de published).
 */
export async function listPublicPhotos({
  limitN,
  categoryId,
  cursor,
  forceApi,
}: PageInput): Promise<{ items: PublicPhoto[]; nextCursor: number | null }> {
  // 1) API (Admin) — robusto para o admin, ignora regras do client
  try {
    const params = new URLSearchParams();
    params.set("limit", String(limitN));
    if (categoryId) params.set("categoryId", categoryId);
    if (cursor != null) params.set("cursor", String(cursor));

    const res = await fetch(
      `/api/public-photos/list?${params.toString()}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return {
      items: (data.items || []) as PublicPhoto[],
      nextCursor: (data.nextCursor ?? null) as number | null,
    };
  } catch (e: any) {
    // ignora; cai para o client SDK (a menos que forceApi)
    if (forceApi) {
      const msg = e?.message ? String(e.message) : String(e);
      throw new Error(msg);
    }
  }

  // 2) Fallback: Firestore client (apenas published == true, conforme rules)
  const constraints: any[] = [where("published", "==", true), orderBy("createdAt", "desc"), limit(limitN)];
  if (categoryId) constraints.unshift(where("categoryId", "==", categoryId));
  if (cursor != null) constraints.push(startAfter(cursor));

  const snap = await getDocs(query(collection(db, "public_photos"), ...constraints));
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as PublicPhoto[];
  const nextCursor = items.length ? (items[items.length - 1].createdAt as number) : null;

  return { items, nextCursor };
}

/* ------------------------------ Upload (master) ------------------------------ */

/**
 * Envia o ficheiro original para `masters/public/*` e cria o doc em `public_photos`
 * como "processing". A Cloud Function trata das variantes e marca como `ready/published`.
 */
export async function uploadMasterAndCreateProcessingDoc(opts: {
  file: File;
  categoryId: string;
  title?: string;
  alt?: string;
  sequenceNumber: number;
}) {
  const ext = (opts.file.name.split(".").pop() || "jpg").toLowerCase();
  const photoId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  const masterPath = `masters/public/${photoId}.${ext}`;

  // Upload para o Firebase Storage (requer utilizador Firebase Auth no cliente)
  await uploadWithRetry(masterPath, opts.file);

  const createdAt = Date.now();

  await postJsonWithRetry("/api/public-photos/create", {
    title: opts.title || null,
    alt: opts.alt || opts.title || null,
    categoryId: opts.categoryId,
    createdAt,
    masterPath,
    sequenceNumber: opts.sequenceNumber,
  });

  return { photoId, masterPath, createdAt };
}

/* ------------------------------ Delete (conveniência) ------------------------------ */

/**
 * Remove uma foto via API Admin (também dispara a Function para limpar variants/master).
 */
export async function deletePublicPhoto(photoId: string): Promise<void> {
  const res = await fetch("/api/public-photos/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoId }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

/* ------------------------------ Upload privado (masters/private) ------------------------------ */

/**
 * Envia ficheiro para `masters/private/*`. Não cria documento no Firestore nem gera variantes.
 */
function slugifySegment(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type PrivateUploadOpts = {
  file: File;
  sessionId: string;
};

export async function uploadPrivateMaster({ file, sessionId }: PrivateUploadOpts) {
  const cleanSession =
    slugifySegment(sessionId) || slugifySegment(file.name.split(".")[0] || "sessao");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const photoId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  const masterPath = `masters/sessions/${cleanSession}/${photoId}.${ext}`;

  await uploadWithRetry(masterPath, file);

  return { photoId, masterPath, createdAt: Date.now(), sessionId: cleanSession };
}

type RegisterPrivatePhotoOpts = {
  sessionId: string;
  masterPath: string;
  title?: string;
  alt?: string;
  createdAt?: number;
  sequenceNumber: number;
};

export async function registerPrivateSessionPhoto(opts: RegisterPrivatePhotoOpts) {
  const res = await postJsonWithRetry("/api/session-photos/register", {
    sessionId: opts.sessionId,
    masterPath: opts.masterPath,
    title: opts.title ?? null,
    alt: opts.alt ?? opts.title ?? null,
    createdAt: opts.createdAt ?? Date.now(),
    sequenceNumber: opts.sequenceNumber,
  });
  return res.json().catch(() => ({}));
}
