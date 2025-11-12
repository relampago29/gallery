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
      setCats(c.map(x => ({ id: x.id, name: x.name })));
    } catch (err) {
      console.error("categories load failed:", err);
      setCats([]); // evita crash
    }
  })();
}, []);

  async function load(reset = false) {
    if (reset) {
      setLoading(true);
      setError(null);
      const { items, nextCursor } = await listPublicPhotos({
        limitN: 24,
        categoryId,
        cursor: null,
        forceApi: true,
      }).catch((e) => { setError(e?.message || 'Erro a carregar'); return { items: [], nextCursor: null }; });
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
      }).catch((e) => { setError(e?.message || 'Erro a carregar'); return { items: [], nextCursor: null }; });
      setItems((prev) => [...prev, ...more]);
      setCursor(nextCursor ?? null);
      setEnd(!nextCursor);
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
      await deletePublicPhoto(id); // via API (Admin SDK) para contornar rules do client
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      console.error("delete failed", e);
      alert(e?.message || "Falha ao apagar");
    }
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfólio — Lista</h1>
          <p className="text-sm text-gray-500">Filtra por categoria, pesquisa por título e gere as fotos públicas.</p>
        </div>
        <div className="flex gap-2">
          <input
            className="input input-bordered w-64"
            placeholder="Pesquisar título…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-outline" onClick={() => load(true)} disabled={loading}>Refresh</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1.5 rounded-full border ${!categoryId ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200"}`}
          onClick={() => setCategoryId(undefined)}
        >
          Todas
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`px-3 py-1.5 rounded-full border ${categoryId === c.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <section className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">Resultados</div>
          <div className="text-sm text-gray-500">{filtered.length} itens</div>
        </div>

        {error && (
          <div className="px-4 pt-4">
            <div className="alert alert-error">
              <span>{error.includes('index') || error.includes('FAILED_PRECONDITION') ? 'A consulta precisa de um índice Firestore. Faz deploy dos índices.' : error}</span>
            </div>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="p-6 text-gray-500">A carregar…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Sem resultados.</div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((p) => {
              const t = pickThumb(p);
              return (
                <div key={p.id} className="rounded-xl border bg-white overflow-hidden">
                  {t.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.src} alt={p.alt || p.title || "foto"} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-500">
                      {p.status === "processing" ? "A gerar variantes..." : "Sem preview"}
                    </div>
                  )}
                  <div className="p-3 flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium truncate max-w-[180px]">{p.title || "(sem título)"}</div>
                      <div className="text-xs text-gray-500">{p.status || "—"}</div>
                    </div>
                    <button className="btn btn-sm btn-error btn-outline" onClick={() => handleDelete(p.id)}>
                      Apagar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-4 border-t flex justify-center">
          <button className="btn btn-outline" onClick={() => load(false)} disabled={loading || end}>
            {end ? "Não há mais" : loading ? "A carregar…" : "Carregar mais"}
          </button>
        </div>
      </section>
    </main>
  );
}
