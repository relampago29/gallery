"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";
import { CalendarDays, Trash2 } from "lucide-react";

type EventItem = {
  id: string;
  title: string;
  coverUrl: string;
  date: string;
  pricePerPhoto: number;
  photoCount: number;
  published: boolean;
};

export default function EventsListPage() {
  const locale = useLocale();
  const base = `/${locale}/admin/events`;
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info" | "confirm";
    message: string;
    actions?: {
      label: string;
      onClick: () => void;
      variant?: "primary" | "ghost";
    }[];
  } | null>(null);

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";

  const loadEvents = useCallback(async (cursor?: string | null) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const url = cursor
        ? `/api/events/list?limit=50&cursor=${encodeURIComponent(cursor)}`
        : "/api/events/list?limit=50";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const newItems = Array.isArray(data.items) ? data.items : [];
      if (cursor) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar eventos.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const deleteEvent = async (eventId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessão expirada");
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao apagar");
      }
      setItems((prev) => prev.filter((e) => e.id !== eventId));
      setToast({ type: "success", message: "Evento apagado." });
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Erro ao apagar evento.",
      });
    }
  };

  const confirmDelete = (eventId: string, title: string) => {
    setToast({
      type: "confirm",
      message: `Apagar evento "${title}"? Todas as fotos serão eliminadas.`,
      actions: [
        { label: "Cancelar", onClick: () => setToast(null), variant: "ghost" },
        {
          label: "Apagar",
          onClick: () => {
            setToast(null);
            deleteEvent(eventId);
          },
          variant: "primary",
        },
      ],
    });
  };

  return (
    <div className="space-y-10">
      {toast && (
        <AdminNotification
          type={toast.type}
          message={toast.message}
          actions={toast.actions}
          onClose={() => setToast(null)}
        />
      )}

      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Admin
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-white tracking-tight">
              Eventos
            </h1>
            <p className="text-sm text-white/70">
              Gere os eventos fotográficos e as suas fotos.
            </p>
          </div>
          <Link
            href={`${base}/create`}
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
          >
            + Criar evento
          </Link>
        </div>
      </header>

      <section className={cardClass}>
        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-white/60">
              A carregar…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/60">
              Ainda não existem eventos. Cria um para começar.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((ev) => (
                <div
                  key={ev.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-white/20"
                >
                  <Link href={`${base}/${ev.id}`}>
                    <div className="aspect-[4/3] bg-white/10">
                      {ev.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.coverUrl}
                          alt={ev.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <CalendarDays size={32} className="text-white/30" />
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3 space-y-1">
                      <div className="truncate text-sm font-medium text-white">
                        {ev.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/50">
                        <span>{ev.date}</span>
                        <span>·</span>
                        <span>{ev.photoCount || 0} fotos</span>
                        <span>·</span>
                        <span>{ev.pricePerPhoto?.toFixed(2)}€/foto</span>
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => confirmDelete(ev.id, ev.title)}
                    className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white/70 opacity-0 transition hover:text-red-300 group-hover:opacity-100"
                    title="Apagar evento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {nextCursor && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => loadEvents(nextCursor)}
                disabled={loadingMore}
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-2.5 text-sm text-white transition hover:bg-white/10 disabled:opacity-40"
              >
                {loadingMore ? "A carregar…" : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
