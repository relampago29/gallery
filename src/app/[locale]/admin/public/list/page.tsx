"use client";

import { useEffect, useMemo, useState } from "react";
import { listActiveCategories } from "@/lib/categories";
import {
  listPublicPhotos,
  pickThumb,
  type PublicPhoto,
  deletePublicPhoto,
} from "@/lib/publicPhotos";
import { AdminNotification } from "@/components/admin/Notification";
import { Search, Trash2, RefreshCw, ImageIcon } from "lucide-react";

export default function PublicListPage() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<PublicPhoto[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState(false);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
    actions?: {
      label: string;
      onClick: () => void;
      variant?: "primary" | "ghost";
    }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await listActiveCategories();
        setCats(c.map((x) => ({ id: x.id, name: x.name })));
      } catch (err) {
        console.error("categories load failed:", err);
        setCats([]);
      }
    })();
  }, []);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  async function load(reset = false) {
    if (reset) {
      setLoading(true);
      setError(null);
      const { items, nextCursor } = await listPublicPhotos({
        limitN: 24,
        categoryId,
        cursor: null,
        forceApi: true,
      }).catch((e) => {
        setError(e?.message || "Erro a carregar");
        return { items: [], nextCursor: null };
      });
      setItems(items);
      setCursor(nextCursor ?? null);
      setEnd(!nextCursor);
      setLoading(false);
    } else {
      if (loading || end) return;
      setLoading(true);
      const { items: more, nextCursor } = await listPublicPhotos({
        limitN: 24,
        categoryId,
        cursor,
        forceApi: true,
      }).catch((e) => {
        setError(e?.message || "Erro a carregar");
        return { items: [], nextCursor: null };
      });
      setItems((prev) => [...prev, ...more]);
      setCursor(nextCursor ?? null);
      setEnd(!nextCursor);
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => (p.title || "").toLowerCase().includes(s));
  }, [items, q]);

  function confirmDelete(id: string) {
    setToast({
      type: "warning",
      message: "Apagar esta foto do portfólio?",
      actions: [
        { label: "Cancelar", onClick: () => setToast(null) },
        {
          label: "Apagar",
          variant: "primary",
          onClick: async () => {
            setToast(null);
            try {
              await deletePublicPhoto(id);
              setItems((prev) => prev.filter((p) => p.id !== id));
              setToast({ type: "success", message: "Foto apagada." });
            } catch (e: any) {
              console.error("delete failed", e);
              setToast({
                type: "error",
                message: e?.message || "Falha ao apagar",
              });
            }
          },
        },
      ],
    });
  }

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const pillButton =
    "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 disabled:opacity-40";

  return (
    <div className="space-y-8">
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
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Admin
        </p>
        <h1 className="text-4xl font-semibold text-white tracking-tight">
          Portfólio público
        </h1>
        <p className="text-sm text-white/70">
          Filtra por categoria, pesquisa por título e gere as fotos do portfólio
          público.
        </p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              !categoryId
                ? "bg-white text-gray-900"
                : "border border-white/20 bg-transparent text-white/70 hover:border-white/40"
            }`}
            onClick={() => setCategoryId(undefined)}
          >
            Todas
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                categoryId === c.id
                  ? "bg-white text-gray-900"
                  : "border border-white/20 bg-transparent text-white/70 hover:border-white/40"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            className="w-full rounded-2xl border border-white/15 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/20"
            placeholder="Pesquisar título…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Results card */}
      <section className={cardClass}>
        <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <ImageIcon size={14} />
            <span>
              <span className="font-semibold text-white">
                {filtered.length}
              </span>{" "}
              itens
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => load(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Recarregar
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-red-400/60 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/10 disabled:opacity-40"
              onClick={() => {
                if (purging) return;
                setToast({
                  type: "warning",
                  message:
                    "Isto vai apagar TODAS as fotos públicas. Continuar?",
                  actions: [
                    { label: "Cancelar", onClick: () => setToast(null) },
                    {
                      label: "Apagar tudo",
                      variant: "primary",
                      onClick: async () => {
                        setToast(null);
                        setPurging(true);
                        try {
                          const res = await fetch(
                            "/api/public-photos/delete-all",
                            { method: "POST" }
                          );
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(
                              data?.error || `Falha (${res.status})`
                            );
                          }
                          setItems([]);
                          setCursor(null);
                          setEnd(true);
                          setMsg("Todas as fotos públicas foram removidas.");
                          setToast({
                            type: "success",
                            message: "Todas as fotos foram apagadas.",
                          });
                        } catch (err: any) {
                          setToast({
                            type: "error",
                            message:
                              err?.message ||
                              "Não foi possível apagar todas as fotos.",
                          });
                        } finally {
                          setPurging(false);
                        }
                      },
                    },
                  ],
                });
              }}
              disabled={purging || items.length === 0}
            >
              <Trash2 size={10} />
              {purging ? "A apagar…" : "Apagar tudo"}
            </button>
          </div>
        </div>

        {msg && (
          <div className="border-b border-white/10 px-6 py-3 text-sm text-white/80">
            {msg}
          </div>
        )}

        {error && (
          <div className="px-6 py-4">
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error.includes("index") || error.includes("FAILED_PRECONDITION")
                ? "A consulta precisa de um índice Firestore. Faz deploy dos índices."
                : error}
            </div>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="px-6 py-10 text-center text-white/60">
            A carregar…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-white/60">
            Sem resultados.
          </div>
        ) : (
          <div className="photo-grid grid gap-6 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const t = pickThumb(p);
              return (
                <div
                  key={p.id}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-white/20"
                >
                  <div className="aspect-4/3 bg-white/10 overflow-hidden">
                    {t.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.src}
                        alt={p.alt || p.title || "Foto"}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-white/60">
                        {p.status === "processing"
                          ? "A gerar variantes…"
                          : "Sem preview"}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0 text-sm text-white/90">
                      <div className="truncate text-base font-medium">
                        {p.title || "(sem título)"}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-white/50">
                        {p.status || "—"}
                      </div>
                    </div>
                    <button
                      className="rounded-full border border-red-400/70 px-4 py-1 text-xs text-red-100 hover:bg-red-500/10"
                      onClick={() => confirmDelete(p.id)}
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-white/10 px-6 py-4 text-center">
          <button
            className={pillButton}
            onClick={() => load(false)}
            disabled={loading || end}
          >
            {end ? "Não há mais" : loading ? "A carregar…" : "Carregar mais"}
          </button>
        </div>
      </section>
    </div>
  );
}
