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
  addDoc,
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
    if (res.ok) {
      const data = await res.json();
      return {
        items: (data.items || []) as PublicPhoto[],
        nextCursor: (data.nextCursor ?? null) as number | null,
      };
    }
  } catch {
    // ignora; cai para o client SDK
  }

  // 2) Fallback: Firestore client (apenas published == true, conforme rules)
  const constraints: any[] = [orderBy("createdAt", "desc"), limit(limitN)];
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
}) {
  const ext = (opts.file.name.split(".").pop() || "jpg").toLowerCase();
  const photoId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  const masterPath = `masters/public/${photoId}.${ext}`;

  // Upload para o Firebase Storage (requer utilizador Firebase Auth no cliente)
  const task = uploadBytesResumable(ref(storage, masterPath), opts.file, {
    contentType: opts.file.type,
  });

  await new Promise<void>((resolve, reject) => {
    task.on("state_changed", undefined, reject, () => resolve());
  });

  const createdAt = Date.now();

  // Cria o doc "processing" preferindo a API server (Admin SDK). Se falhar, faz fallback.
  try {
    const res = await fetch("/api/public-photos/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: opts.title || null,
        alt: opts.alt || opts.title || null,
        categoryId: opts.categoryId,
        createdAt,
        masterPath,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
  } catch {
    // fallback: grava direto no client (irá falhar se rules não permitirem write)
    await addDoc(collection(db, "public_photos"), {
      title: opts.title || null,
      alt: opts.alt || opts.title || null,
      categoryId: opts.categoryId,
      createdAt,
      published: false,
      status: "processing",
      masterPath,
    });
  }

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
