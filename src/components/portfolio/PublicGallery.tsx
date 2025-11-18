"use client";

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { pickThumb, type PublicPhoto } from "@/lib/publicPhotos";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("portofolioPage");
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const selectedPhoto = useMemo(
    () => photos.find((photo) => photo.id === selectedPhotoId) || null,
    [photos, selectedPhotoId]
  );

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

  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPhotoId(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedPhoto]);

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
        {t("empty")}
      </div>
    );
  }

  const cards = photos.map((p) => {
    const cover = pickThumb(p);
    const openPhoto = () => {
      if (cover.src) {
        setSelectedPhotoId(p.id);
      }
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPhoto();
      }
    };

    return (
      <article
        key={p.id}
        className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/30"
        role={cover.src ? "button" : undefined}
        tabIndex={cover.src ? 0 : undefined}
        onClick={cover.src ? openPhoto : undefined}
        onKeyDown={cover.src ? handleKeyDown : undefined}
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
  });

  const selectedCover = selectedPhoto ? pickThumb(selectedPhoto) : null;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{cards}</div>

      {selectedPhoto && selectedCover?.src && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhotoId(null)}
        >
          <div
            className="relative w-full max-w-4xl space-y-4 rounded-3xl bg-black/40 p-4 text-white shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-white/30 px-3 py-1 text-sm text-white/80 transition hover:border-white/70 hover:text-white"
              onClick={() => setSelectedPhotoId(null)}
            >
              Fechar
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedCover.src}
              alt={selectedPhoto.alt || selectedPhoto.title || "Portfólio"}
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
            <div className="space-y-1 px-1">
              <h3 className="text-xl font-semibold">{selectedPhoto.title || "(sem título)"}</h3>
              <p className="text-sm text-white/70">{selectedPhoto.alt || "História captada recentemente"}</p>
              <div className="text-xs uppercase tracking-wide text-white/50">
                {formatDate(selectedPhoto.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
