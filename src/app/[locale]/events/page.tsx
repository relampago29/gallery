"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/shared/navbar/navbar";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { CalendarDays } from "lucide-react";

type EventItem = {
  id: string;
  title: string;
  coverUrl: string;
  date: string;
  pricePerPhoto: number;
  photoCount: number;
};

export default function PublicEventsPage() {
  const locale = useLocale();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/events/list?published=true", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Falha ao carregar eventos");
        const data = await res.json();
        setEvents(Array.isArray(data.items) ? data.items : []);
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar eventos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />

      <main className="mx-auto max-w-6xl space-y-12 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Galeria
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Eventos
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/70">
            Explora os nossos eventos fotográficos. Encontra o teu evento e
            adquire as fotos que mais gostas.
          </p>
        </header>

        {loading ? (
          <div className="py-20 text-center text-sm text-white/60">
            A carregar eventos…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-center text-sm text-red-100">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center text-sm text-white/60">
            Ainda não existem eventos publicados.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                locale={locale}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-white/20 hover:shadow-[0_25px_120px_rgba(255,255,255,0.05)]"
              >
                <div className="aspect-[16/10] bg-white/10">
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
                    <span>{ev.photoCount || 0} fotos</span>
                    <span>·</span>
                    <span>{ev.pricePerPhoto?.toFixed(2)}€ / foto</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
