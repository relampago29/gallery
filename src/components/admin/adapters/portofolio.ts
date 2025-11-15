// src/components/admin/adapters/portfolio.ts
import type { PublicPhoto } from "@/lib/publicPhotos";

export type PhotoCardModel = {
  id: string;
  title: string;
  alt?: string;
  thumbnailUrl: string;
  status: "processing" | "ready" | "error";
  category: string;
  uploadedAt: Date;
};

export function toPhotoCardModel(p: PublicPhoto): PhotoCardModel {
  const sizes = p.sizes || {};
  const pref =
    sizes["960"] || sizes["800"] || sizes["640"] || Object.values(sizes)[0] || ({} as any);
  const thumb = pref?.jpg || "";
  return {
    id: p.id,
    title: p.title || "(untitled)",
    alt: p.alt ?? undefined,
    thumbnailUrl: thumb, // Lavble PhotoCard usa uma URL direta
    status: (p.status as any) || "processing",
    category: p.categoryId,
    uploadedAt: new Date(p.createdAt || Date.now()),
  };
}
