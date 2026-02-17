"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/shared/navbar/navbar";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Loader2 } from "lucide-react";

type EventItem = {
  id: string;
  title: string;
  coverUrl: string;
  date: string;
  pricePerPhoto: number;
  photoCount: number;
};

const PAGE_SIZE = 12;

export default function PublicEventsPage() {
  const locale = useLocale();
  const t = useTranslations("eventsPage");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [end, setEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (nextCursor: string | null, append = false) => {
      const params = new URLSearchParams({
        published: "true",
        limit: String(PAGE_SIZE),
      });
      if (nextCursor) params.set("cursor", nextCursor);

      const res = await fetch(`/api/events/list?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(t("loadError"));
      const data = await res.json();
      const items: EventItem[] = Array.isArray(data.items) ? data.items : [];
      const newCursor = data.nextCursor ?? null;

      if (append) {
        setEvents((prev) => [...prev, ...items]);
      } else {
        setEvents(items);
      }
      setCursor(newCursor);
      setEnd(!newCursor || items.length < PAGE_SIZE);
    },
    [t],
  );

  useEffect(() => {
    (async () => {
      try {
        await fetchEvents(null);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t("loadErrorGeneric");
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    if (loadingMore || end || !cursor) return;
    setLoadingMore(true);
    try {
      await fetchEvents(cursor, true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("loadErrorGeneric");
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />

      <main className="mx-auto max-w-6xl space-y-12 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            {t("badge")}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/70">
            {t("subtitle")}
          </p>
        </header>

        {loading ? (
          <div className="py-20 text-center text-sm text-white/60">
            {t("loading")}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-center text-sm text-red-100">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center text-sm text-white/60">
            {t("noEvents")}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  locale={locale}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-white/20 hover:shadow-[0_25px_120px_rgba(255,255,255,0.05)]"
                >
                  <div className="aspect-16/10 bg-white/10">
                    {ev.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.coverUrl}
                        alt={ev.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <CalendarDays size={40} className="text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 px-5 py-4">
                    <h2 className="text-lg font-semibold text-white">
                      {ev.title}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>{ev.date}</span>
                      <span>·</span>
                      <span>
                        {ev.photoCount || 0} {t("photos")}
                      </span>
                      <span>·</span>
                      <span>
                        {ev.pricePerPhoto?.toFixed(2)}€ {t("pricePerPhoto")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More */}
            {!end && events.length > 0 && (
              <div className="pt-4 pb-2 text-center">
                <button
                  type="button"
                  onClick={loadMore}
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
      </main>
    </div>
  );
}
