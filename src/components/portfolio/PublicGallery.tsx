"use client";

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { pickThumb, type PublicPhoto } from "@/lib/publicPhotos";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  const selectedPhoto = useMemo(
    () => photos.find((photo) => photo.id === selectedPhotoId) || null,
    [photos, selectedPhotoId]
  );

  const selectedIndex = useMemo(
    () =>
      selectedPhotoId ? photos.findIndex((p) => p.id === selectedPhotoId) : -1,
    [photos, selectedPhotoId]
  );

  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < photos.length - 1;

  function goToPrev() {
    if (hasPrev) setSelectedPhotoId(photos[selectedIndex - 1].id);
  }
  function goToNext() {
    if (hasNext) setSelectedPhotoId(photos[selectedIndex + 1].id);
  }

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

  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPhotoId(null);
      } else if (event.key === "ArrowLeft") {
        setSelectedPhotoId((prev) => {
          const idx = photos.findIndex((p) => p.id === prev);
          return idx > 0 ? photos[idx - 1].id : prev;
        });
      } else if (event.key === "ArrowRight") {
        setSelectedPhotoId((prev) => {
          const idx = photos.findIndex((p) => p.id === prev);
          return idx >= 0 && idx < photos.length - 1
            ? photos[idx + 1].id
            : prev;
        });
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedPhoto, photos]);

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
        <div
          className="relative aspect-[4/3] bg-white/5"
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
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/60">
              {p.status === "processing" ? t("processing") : t("noPreview")}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="space-y-2 px-5 py-4">
          <h3 className="text-lg font-semibold text-white truncate">
            {p.title || t("noTitle")}
          </h3>
          <p className="text-sm text-white/70 truncate">
            {p.alt || t("recentCapture")}
          </p>
          <div className="text-xs text-white/50 uppercase tracking-wide">
            <span>{formatDate(p.createdAt, locale)}</span>
          </div>
          {p.lqip?.blurDataURL && (
            <div className="text-[10px] text-white/40">
              {p.status === "processing" ? t("processing") : t("published")}
            </div>
          )}
        </div>
      </article>
    );
  });

  const selectedCover = selectedPhoto ? pickThumb(selectedPhoto, "lg") : null;

  return (
    <>
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
      </>

      {selectedPhoto && selectedCover?.src && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhotoId(null)}
        >
          {/* Previous arrow */}
          {hasPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/70 backdrop-blur-sm transition hover:border-white/40 hover:bg-black/70 hover:text-white sm:left-4 sm:p-3"
              aria-label={t("prevPhoto")}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Next arrow */}
          {hasNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/70 backdrop-blur-sm transition hover:border-white/40 hover:bg-black/70 hover:text-white sm:right-4 sm:p-3"
              aria-label={t("nextPhoto")}
            >
              <ChevronRight size={24} />
            </button>
          )}

          <div
            className="relative w-full max-w-4xl space-y-4 rounded-3xl bg-black/40 p-4 text-white shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-10 rounded-full border border-white/30 px-3 py-1 text-sm text-white/80 transition hover:border-white/70 hover:text-white"
              onClick={() => setSelectedPhotoId(null)}
            >
              {t("close")}
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedCover.src}
              alt={selectedPhoto.alt || selectedPhoto.title || t("defaultAlt")}
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
            <div className="space-y-1 px-1">
              <h3 className="text-xl font-semibold">
                {selectedPhoto.title || t("noTitle")}
              </h3>
              <p className="text-sm text-white/70">
                {selectedPhoto.alt || t("recentCapture")}
              </p>
              <div className="text-xs uppercase tracking-wide text-white/50">
                {formatDate(selectedPhoto.createdAt, locale)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
