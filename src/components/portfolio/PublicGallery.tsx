"use client";

import { useEffect, useMemo, useState } from "react";
import { pickThumb, type PublicPhoto } from "@/lib/publicPhotos";
import { useLocale, useTranslations } from "next-intl";
import { Maximize2 } from "lucide-react";
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@/components/shared/PhotoLightbox";

function formatDate(ts: number | undefined, locale: string) {
  if (!ts) return "";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function PublicGallery({ categoryId }: { categoryId?: string }) {
  const t = useTranslations("portofolioPage");
  const locale = useLocale();
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [end, setEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const PAGE_SIZE = 12;

  async function fetchBatch(nextCursor: number | null) {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    if (categoryId) params.set("categoryId", categoryId);
    if (nextCursor != null) params.set("cursor", String(nextCursor));
    const res = await fetch(`/api/public-photos/list?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const items = (
      Array.isArray(data.items) ? data.items : []
    ) as PublicPhoto[];
    return {
      items: items.filter((p) => p.published !== false),
      nextCursor: (data.nextCursor ?? null) as number | null,
    };
  }

  useEffect(() => {
    setInitialLoading(true);
    setError(null);
    setPhotos([]);
    setCursor(null);
    setEnd(false);
    (async () => {
      try {
        const batch = await fetchBatch(null);
        setPhotos(batch.items);
        setCursor(batch.nextCursor);
        setEnd(!batch.nextCursor);
      } catch (err: any) {
        setError(err?.message || t("loadError"));
        setPhotos([]);
        setCursor(null);
        setEnd(true);
      } finally {
        setInitialLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  async function loadMore() {
    if (loadingMore || end || cursor == null) return;
    setLoadingMore(true);
    try {
      const batch = await fetchBatch(cursor);
      setPhotos((prev) => [...prev, ...batch.items]);
      setCursor(batch.nextCursor);
      setEnd(!batch.nextCursor || batch.items.length === 0);
    } catch (err: any) {
      setError(err?.message || t("loadMoreError"));
    } finally {
      setLoadingMore(false);
    }
  }

  const lightboxPhotos: LightboxPhoto[] = useMemo(
    () =>
      photos
        .map((p) => {
          const cover = pickThumb(p, "lg");
          return cover.src
            ? { id: p.id, src: cover.src, alt: p.alt || p.title || undefined }
            : null;
        })
        .filter((x): x is LightboxPhoto => x !== null),
    [photos],
  );

  if (initialLoading) {
    return (
      <div className="py-16 text-center text-sm text-white/70">
        {t("preparingImages")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-6 text-sm text-red-100">
        {error.includes("index") ? t("indexError") : error}
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
    const cover = pickThumb(p, "sm");
    const blurBg = p.lqip?.blurDataURL || p.lqip?.dominant;

    return (
      <article
        key={p.id}
        className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/30"
      >
        <div
          className="relative aspect-4/3 bg-white/5"
          style={
            blurBg
              ? {
                  background: blurBg.startsWith("data:")
                    ? `url(${blurBg}) center/cover no-repeat`
                    : blurBg,
                }
              : undefined
          }
        >
          {cover.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.src}
              alt={p.alt || p.title || t("defaultAlt")}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/60">
              {p.status === "processing" ? t("processing") : t("noPreview")}
            </div>
          )}
          {/* Hover overlay + expand button */}
          {cover.src && (
            <button
              type="button"
              onClick={() => setSelectedPhotoId(p.id)}
              className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30"
              aria-label={t("expandPhoto") || "Ampliar foto"}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Maximize2 size={18} />
              </span>
            </button>
          )}
        </div>
        <div className="px-5 py-3">
          <div className="text-xs text-white/50 uppercase tracking-wide">
            {formatDate(p.createdAt, locale)}
          </div>
        </div>
      </article>
    );
  });

  return (
    <>
      <div className="photo-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards}
      </div>

      {!end && photos.length > 0 && (
        <div className="pt-8 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:opacity-50"
          >
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </button>
        </div>
      )}

      <PhotoLightbox
        photos={lightboxPhotos}
        selectedId={selectedPhotoId}
        onClose={() => setSelectedPhotoId(null)}
        onChangeId={setSelectedPhotoId}
      />
    </>
  );
}
