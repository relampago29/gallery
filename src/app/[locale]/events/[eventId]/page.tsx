"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import NavBar from "@/components/shared/navbar/navbar";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { useCart, type CartItem } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";

type EventData = {
  id: string;
  title: string;
  coverUrl: string;
  date: string;
  pricePerPhoto: number;
  photoCount: number;
  description: string | null;
};

type EventPhoto = {
  id: string;
  imageUrl?: string;
  masterPath?: string;
  title?: string | null;
  status?: string;
  createdAt?: number;
  sizes?: Record<
    string,
    {
      jpg: string;
      webp?: string;
      avif?: string;
      width: number;
      height: number;
    }
  >;
};

function pickPhotoThumb(photo: EventPhoto): string {
  if (photo.sizes) {
    const preferred = ["640", "800", "400", "960"];
    for (const k of preferred) {
      const s = photo.sizes[k];
      if (s?.webp) return s.webp;
      if (s?.avif) return s.avif;
      if (s?.jpg) return s.jpg;
    }
    for (const s of Object.values(photo.sizes)) {
      if (s?.webp) return s.webp;
      if (s?.jpg) return s.jpg;
    }
  }
  return photo.imageUrl || "";
}

const PHOTO_PAGE_SIZE = 24;

export default function PublicEventDetailPage() {
  const locale = useLocale();
  const t = useTranslations("eventDetailPage");
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId || "";
  const cart = useCart();

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [photoCursor, setPhotoCursor] = useState<string | null>(null);
  const [photosEnd, setPhotosEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(
    async (cursor: string | null, append = false) => {
      const params = new URLSearchParams({
        limit: String(PHOTO_PAGE_SIZE),
      });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(
        `/api/events/${eventId}/photos?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      const items: EventPhoto[] = Array.isArray(data.items) ? data.items : [];
      const nextCursor = data.nextCursor ?? null;

      if (append) {
        setPhotos((prev) => [...prev, ...items]);
      } else {
        setPhotos(items);
      }
      setPhotoCursor(nextCursor);
      setPhotosEnd(!nextCursor || items.length < PHOTO_PAGE_SIZE);
    },
    [eventId],
  );

  useEffect(() => {
    (async () => {
      try {
        const evRes = await fetch(`/api/events/${eventId}`, {
          cache: "no-store",
        });
        if (!evRes.ok) throw new Error(t("notFound"));
        const evData = await evRes.json();
        setEvent(evData);

        await fetchPhotos(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("loadError");
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadMorePhotos() {
    if (loadingMore || photosEnd || !photoCursor) return;
    setLoadingMore(true);
    try {
      await fetchPhotos(photoCursor, true);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }

  const publishedPhotos = useMemo(
    () => photos.filter((p) => p.status === "ready" || p.imageUrl),
    [photos],
  );

  function handleToggle(photo: EventPhoto) {
    if (!event) return;
    const thumb = pickPhotoThumb(photo);
    const item: CartItem = {
      photoId: photo.id,
      eventId,
      eventTitle: event.title,
      thumbUrl: thumb,
      masterPath: photo.masterPath || "",
      title: photo.title || null,
      pricePerPhoto: event.pricePerPhoto || 0,
      createdAt: null,
    };
    cart.toggle(item);
  }

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />

      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <Link
          href="/events"
          locale={locale}
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white transition"
        >
          <ArrowLeft size={14} /> {t("backToEvents")}
        </Link>

        {loading ? (
          <div className="py-20 text-center text-sm text-white/60">
            {t("loading")}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-center text-sm text-red-100">
            {error}
          </div>
        ) : event ? (
          <>
            {/* Hero do evento */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              {event.coverUrl && (
                <div className="aspect-21/9 bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.coverUrl}
                    alt={event.title}
                    className="h-full w-full object-cover"
                    decoding="async"
                  />
                </div>
              )}
              <div className="space-y-3 p-6 sm:p-8">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {event.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={14} /> {event.date}
                  </span>
                  <span>
                    {event.photoCount || publishedPhotos.length} {t("photos")}
                  </span>
                  <span className="rounded-full border border-white/20 px-3 py-0.5 text-xs text-white/80">
                    {event.pricePerPhoto?.toFixed(2)}€ / foto
                  </span>
                </div>
                {event.description && (
                  <p className="max-w-2xl text-sm text-white/70">
                    {event.description}
                  </p>
                )}
              </div>
            </div>

            {/* Hint bar */}
            {publishedPhotos.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
                <p className="text-sm text-white/60">
                  <ShoppingCart size={14} className="mr-1.5 inline" />
                  {t("selectPhotosHint")}
                </p>
                {cart.count > 0 && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-900">
                    {cart.count} {t("inCart")} · {cart.total.toFixed(2)}€
                  </span>
                )}
              </div>
            )}

            {/* Grid de fotos */}
            {publishedPhotos.length === 0 ? (
              <div className="py-16 text-center text-sm text-white/60">
                {t("photosAvailableSoon")}
              </div>
            ) : (
              <>
                <div className="photo-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {publishedPhotos.map((p) => {
                    const thumb = pickPhotoThumb(p);
                    const inCart = cart.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggle(p)}
                        className={`group relative overflow-hidden rounded-3xl border text-left shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm transition ${
                          inCart
                            ? "border-emerald-400/50 bg-emerald-500/10 ring-1 ring-emerald-400/30"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="aspect-4/3 bg-white/10">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt={p.title || t("photoAlt")}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-white/70">
                              {p.status === "processing"
                                ? t("processing")
                                : t("noPreview")}
                            </div>
                          )}
                        </div>
                        {/* Selection indicator */}
                        <div
                          className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full transition ${
                            inCart
                              ? "bg-emerald-500 text-white"
                              : "border border-white/30 bg-black/50 text-transparent group-hover:text-white/50"
                          }`}
                        >
                          <Check size={14} />
                        </div>
                        {/* Price badge */}
                        <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                          {event.pricePerPhoto?.toFixed(2)}€
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Load More */}
                {!photosEnd && publishedPhotos.length > 0 && (
                  <div className="pt-4 pb-2 text-center">
                    <button
                      type="button"
                      onClick={loadMorePhotos}
                      disabled={loadingMore}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm text-white transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 sm:w-auto sm:py-2"
                    >
                      {loadingMore && (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      {loadingMore ? t("loadingMore") : t("loadMore")}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </main>

      <CartDrawer />
    </div>
  );
}
