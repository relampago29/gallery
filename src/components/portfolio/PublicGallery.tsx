"use client";

import { useEffect, useState } from "react";
import { pickThumb, type PublicPhoto } from "@/lib/publicPhotos";
import Link from "next/link";

function formatDate(ts?: number) {
  if (!ts) return "";
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function PublicGallery() {
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public-photos/list?limit=48", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const items = (Array.isArray(data.items) ? data.items : []) as PublicPhoto[];
        setPhotos(items.filter((p) => p.published !== false));
      } catch (err: any) {
        setError(err?.message || "Falha ao carregar o portfólio. Tenta novamente em instantes.");
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-white/70">
        A preparar as imagens…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-6 text-sm text-red-100">
        {error.includes("index")
          ? "Precisamos de publicar o índice do Firestore para concluir esta secção."
          : error}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-white/70">
        Ainda não há histórias públicas aqui — volta em breve.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((p) => {
        const cover = pickThumb(p);
        return (
          <article
            key={p.id}
            className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/30"
          >
            <div className="relative aspect-[4/3] bg-white/5">
              {cover.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.src}
                  alt={p.alt || p.title || "Portfólio"}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/60">
                  {p.status === "processing" ? "A gerar variantes…" : "Sem preview"}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="space-y-2 px-5 py-4">
              <h3 className="text-lg font-semibold text-white truncate">{p.title || "(sem título)"}</h3>
              <p className="text-sm text-white/70 truncate">{p.alt || "História captada recentemente"}</p>
              <div className="flex items-center justify-between text-xs text-white/50 uppercase tracking-wide">
                <span>{formatDate(p.createdAt)}</span>
                {p.categoryId ? (
                  <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] tracking-wider">
                    {p.categoryId}
                  </span>
                ) : null}
              </div>
              {p.lqip?.blurDataURL && (
                <div className="text-[10px] text-white/40">
                  {p.status === "processing" ? "A processar" : "Publicado"}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

