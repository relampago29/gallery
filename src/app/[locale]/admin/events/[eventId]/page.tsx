"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";
import { useUploadProgress } from "@/components/admin/UploadProgressContext";
import { CalendarDays, Trash2, UploadCloud, ArrowLeft } from "lucide-react";

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
  sizes?: Record<
    string,
    { jpg: string; webp?: string; avif?: string; width: number; height: number }
  >;
};

function pickPhotoThumb(photo: EventPhoto): string {
  if (photo.sizes) {
    const first = Object.values(photo.sizes)[0];
    if (first?.webp) return first.webp;
    if (first?.jpg) return first.jpg;
  }
  return photo.imageUrl || "";
}

const MAX_PARALLEL = 3;

type UploadResult = { ok: boolean; fileName: string; error?: string };

async function runWithConcurrency(
  tasks: { fn: () => Promise<void>; fileName: string }[],
  limit = MAX_PARALLEL,
  onProgress?: (completed: number) => void
) {
  if (!tasks.length) return [] as UploadResult[];
  const poolSize = Math.max(1, Math.min(limit, tasks.length));
  let cursor = 0;
  let completed = 0;
  const results: UploadResult[] = new Array(tasks.length);

  const worker = async () => {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= tasks.length) break;
      const task = tasks[current];
      try {
        await task.fn();
        results[current] = { ok: true, fileName: task.fileName };
      } catch (err: any) {
        results[current] = {
          ok: false,
          fileName: task.fileName,
          error: err?.message || String(err),
        };
      }
      completed += 1;
      onProgress?.(completed);
    }
  };

  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}

export default function EventDetailPage() {
  const locale = useLocale();
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId || "";
  const base = `/${locale}/admin/events`;

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [photoCursor, setPhotoCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info" | "confirm";
    message: string;
    actions?: {
      label: string;
      onClick: () => void;
      variant?: "primary" | "ghost";
    }[];
  } | null>(null);

  const {
    state: globalUpload,
    setUploadProgress,
    clearUpload,
  } = useUploadProgress();
  const uploadScope = "event-photos-upload";
  const globalLock = !!globalUpload && globalUpload.progress < 1;

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const inputBase =
    "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white/50 focus:outline-none disabled:opacity-50";
  const primaryButton =
    "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/90 disabled:opacity-40";

  const loadEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Evento não encontrado");
      const data = await res.json();
      setEvent(data);
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar evento.");
    }
  }, [eventId]);

  const loadPhotos = useCallback(
    async (cursor?: string | null) => {
      if (cursor) {
        setLoadingMore(true);
      }
      try {
        const url = cursor
          ? `/api/events/${eventId}/photos?limit=60&cursor=${encodeURIComponent(
              cursor
            )}`
          : `/api/events/${eventId}/photos?limit=60`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Falha ao carregar fotos");
        const data = await res.json();
        const newItems = Array.isArray(data.items) ? data.items : [];
        if (cursor) {
          setPhotos((prev) => [...prev, ...newItems]);
        } else {
          setPhotos(newItems);
        }
        setPhotoCursor(data.nextCursor ?? null);
      } catch (err: any) {
        setError(err?.message || "Falha ao carregar fotos.");
      } finally {
        setLoadingMore(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadEvent(), loadPhotos()]);
      setLoading(false);
    })();
  }, [loadEvent, loadPhotos]);

  const deletePhoto = async (photoId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessão expirada");
      const res = await fetch(`/api/events/${eventId}/photos/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ photoId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao apagar");
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setEvent((prev) =>
        prev
          ? { ...prev, photoCount: Math.max(0, (prev.photoCount || 1) - 1) }
          : prev
      );
      setToast({ type: "success", message: "Foto apagada." });
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Erro ao apagar foto.",
      });
    }
  };

  const confirmDeletePhoto = (photoId: string) => {
    setToast({
      type: "confirm",
      message: "Apagar esta foto do evento?",
      actions: [
        { label: "Cancelar", onClick: () => setToast(null), variant: "ghost" },
        {
          label: "Apagar",
          onClick: () => {
            setToast(null);
            deletePhoto(photoId);
          },
          variant: "primary",
        },
      ],
    });
  };

  async function onUploadPhotos(e: React.FormEvent) {
    e.preventDefault();
    if (globalLock) {
      setToast({ type: "warning", message: "Existe outro upload em curso." });
      return;
    }
    if (!files.length || !eventId) return;

    setUploading(true);
    setProgress(0);
    setToast(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessão expirada.");

      setUploadProgress({
        label: "Fotos do evento",
        progress: 0,
        scope: uploadScope,
      });
      const total = files.length;

      const tasks = files.map((f) => ({
        fileName: f.name,
        fn: async () => {
          const form = new FormData();
          form.append("file", f);
          form.append("type", "photo");
          form.append("eventId", eventId);
          form.append("name", f.name);

          const res = await fetch("/api/events/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || `Falha (${res.status})`);
          }
        },
      }));

      const results = await runWithConcurrency(tasks, MAX_PARALLEL, (done) => {
        const value = total ? done / total : 0;
        setProgress(value);
        setUploadProgress({
          label: "Fotos do evento",
          progress: value,
          scope: uploadScope,
        });
      });

      const failures = results.filter((r) => !r.ok);
      const successCount = results.length - failures.length;

      setToast({
        type: failures.length ? "warning" : "success",
        message: `${successCount} foto(s) enviadas. ${
          failures.length
            ? `${failures.length} falharam.`
            : "As variantes serão geradas automaticamente."
        }`,
      });

      setFiles([]);
      clearUpload();
      // reload fotos e evento
      await Promise.all([loadPhotos(), loadEvent()]);
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Erro no upload." });
      clearUpload();
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-white/60">A carregar…</div>
    );
  }

  if (error && !event) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-center text-sm text-red-100">
          {error}
        </div>
        <Link href={base} className="text-sm text-white/60 hover:text-white">
          ← Voltar à lista
        </Link>
      </div>
    );
  }

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

      {/* Header */}
      <header className="space-y-3">
        <Link
          href={base}
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white transition"
        >
          <ArrowLeft size={14} /> Voltar à lista
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Evento
            </p>
            <h1 className="text-4xl font-semibold text-white tracking-tight">
              {event?.title}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-white/50">
              <span>{event?.date}</span>
              <span>·</span>
              <span>{event?.photoCount || 0} fotos</span>
              <span>·</span>
              <span>{event?.pricePerPhoto?.toFixed(2)}€/foto</span>
            </div>
          </div>
          {event?.coverUrl && (
            <div className="h-20 w-32 overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.coverUrl}
                alt="Capa"
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </header>

      {/* Upload fotos */}
      <section className={cardClass}>
        <form className="space-y-4 p-6" onSubmit={onUploadPhotos}>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">
              Adicionar fotos
            </p>
            <p className="text-sm text-white/70">
              Seleciona as fotos para adicionar a este evento.
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="w-full rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-gray-900 hover:border-white/40"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            disabled={uploading || globalLock}
          />
          {files.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              Selecionados:{" "}
              <span className="font-semibold text-white">{files.length}</span>{" "}
              ficheiro(s)
            </div>
          )}
          <button
            type="submit"
            className={primaryButton}
            disabled={uploading || files.length === 0 || globalLock}
          >
            {uploading ? (
              "A enviar…"
            ) : (
              <>
                <UploadCloud size={16} className="mr-2" /> Enviar fotos
              </>
            )}
          </button>
        </form>
        {progress !== null && (
          <div className="border-t border-white/10 px-6 py-4">
            <div className="mb-2 text-xs uppercase tracking-[0.3em] text-white/60">
              Envio {Math.round(progress * 100)}%
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Grid de fotos */}
      <section className={cardClass}>
        <div className="p-6">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Fotos do evento
            </p>
            <h2 className="text-2xl font-semibold text-white">
              {photos.length} fotos
            </h2>
          </div>

          {photos.length === 0 ? (
            <div className="py-10 text-center text-sm text-white/60">
              Este evento ainda não tem fotos. Faz upload acima.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((p) => {
                const thumb = pickPhotoThumb(p);
                return (
                  <div
                    key={p.id}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                  >
                    <div className="aspect-[4/3] bg-white/10">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={p.title || "Foto"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-white/70">
                          {p.status === "processing"
                            ? "A gerar variantes…"
                            : "Sem preview"}
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <div className="truncate text-sm font-medium text-white">
                        {p.title || "(sem título)"}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-white/50">
                        {p.status || "–"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => confirmDeletePhoto(p.id)}
                      className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white/70 opacity-0 transition hover:text-red-300 group-hover:opacity-100"
                      title="Apagar foto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {photoCursor && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => loadPhotos(photoCursor)}
                disabled={loadingMore}
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-2.5 text-sm text-white transition hover:bg-white/10 disabled:opacity-40"
              >
                {loadingMore ? "A carregar…" : "Carregar mais fotos"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
