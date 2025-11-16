"use client";

import { useEffect, useMemo, useState } from "react";
import { listActiveCategories } from "@/lib/categories";
import { listPublicPhotos, pickThumb, type PublicPhoto, deletePublicPhoto } from "@/lib/publicPhotos";

export default function PublicListPage() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<PublicPhoto[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const c = await listActiveCategories();
        setCats(c.map((x) => ({ id: x.id, name: x.name })));
      } catch (err) {
        console.error("categories load failed:", err);
        setCats([]);
        setError("Não foi possível carregar as categorias.");
      }
    })();
  }, []);

  async function load(reset = false) {
    if (!reset && (loading || end)) return;
    setLoading(true);
    setError(null);

    try {
      const { items: fetched, nextCursor } = await listPublicPhotos({
        limitN: 24,
        categoryId,
        cursor: reset ? null : cursor,
        forceApi: true,
      });

      setItems(reset ? fetched : (prev) => [...prev, ...fetched]);
      setCursor(nextCursor ?? null);
      setEnd(!nextCursor);
    } catch (err: any) {
      console.error("public photos load failed:", err);
      setError(err?.message || "Erro a carregar as fotos públicas.");
      if (reset) {
        setItems([]);
        setCursor(null);
        setEnd(false);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => (p.title || "").toLowerCase().includes(s));
  }, [items, q]);

  async function handleDelete(id: string) {
    if (!confirm("Apagar esta foto?")) return;
    try {
      await deletePublicPhoto(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      console.error("delete failed", e);
      alert(e?.message || "Falha ao apagar");
    }
  }

  const shellBg = "relative min-h-screen overflow-hidden bg-[#030303] text-gray-100";
  const backdrop =
    "pointer-events-none absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)] before:content-['']";
  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const inputBase =
    "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white/50 focus:outline-none";
  const pillButton =
    "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 disabled:opacity-40";

  return (
    <main className={shellBg}>
      <div className={backdrop}>
        <div className="absolute left-0 top-24 h-72 w-72 rounded-full bg-[#7c3aed1f] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#f472b61f] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-10 py-12 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Admin</p>
            <h1 className="text-4xl font-semibold text-white tracking-tight">Portfólio · Lista</h1>
            <p className="text-sm text-white/70">
              Filtra por categoria, pesquisa por título e gere rapidamente as fotos públicas.
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <input
              className={inputBase}
              placeholder="Pesquisar título..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
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

        <section className={cardClass}>
          <div className="flex flex-col gap-2 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-semibold text-white">Resultados</div>
            <div className="text-sm text-white/60">{filtered.length} itens</div>
          </div>

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
            <div className="px-6 py-10 text-center text-white/60">A carregar...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-white/60">Sem resultados.</div>
          ) : (
            <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const t = pickThumb(p);
                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                  >
                    <div className="aspect-[4/3] bg-white/10">
                      {t.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.src} alt={p.alt || p.title || "Foto"} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-white/60">
                          {p.status === "processing" ? "A gerar variantes..." : "Sem preview"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 text-sm text-white/90">
                        <div className="truncate text-base font-medium">{p.title || "(sem título)"}</div>
                        <div className="text-xs uppercase tracking-wide text-white/50">{p.status || "Sem estado"}</div>
                      </div>
                      <button
                        className="rounded-full border border-red-400/70 px-4 py-1 text-xs text-red-100 hover:bg-red-500/10"
                        onClick={() => handleDelete(p.id)}
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
            <button className={pillButton} onClick={() => load(false)} disabled={loading || end}>
              {end ? "Não há mais" : loading ? "A carregar..." : "Carregar mais"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
