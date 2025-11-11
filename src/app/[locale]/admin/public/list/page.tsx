"use client";

import { useEffect, useMemo, useState } from "react";
import { listActiveCategories } from "@/lib/categories";
import { listPublicPhotos, pickThumb, type PublicPhoto } from "@/lib/publicPhotos";
import { db } from "@/lib/firebase/client";
import { deleteDoc, doc } from "firebase/firestore";

export default function PublicListPage() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const [items, setItems] = useState<PublicPhoto[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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
      const { items, nextCursor } = await listPublicPhotos({
        limitN: 24,
        categoryId,
        cursor: null,
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
      });
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
    await deleteDoc(doc(db, "public_photos", id));
    setItems((prev) => prev.filter((p) => p.id !== id));
    // TODO: Function onDelete para remover master + variants/public
  }

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Portfólio — Lista</h1>
          <p className="text-sm text-gray-500">Filtra por categoria, pesquisa por título e gere as fotos públicas.</p>
        </div>
        <div className="flex gap-2">
          <input
            className="input input-bordered w-64"
            placeholder="Pesquisar título…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-outline" onClick={() => load(true)}>Refresh</button>
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

      {loading && items.length === 0 ? (
        <p>A carregar…</p>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-500">Sem resultados.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((p) => {
              const t = pickThumb(p);
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {t.src ? (
                    <img src={t.src} alt={p.alt || p.title || "foto"} className="w-full h-48 object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      {p.status === "processing" ? "A gerar variantes..." : "Sem preview"}
                    </div>
                  )}
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-sm">
                      {p.title || "(sem título)"}{" "}
                      <span className="text-xs opacity-60">· {p.status || "—"}</span>
                    </div>
                    <button className="text-red-600" onClick={() => handleDelete(p.id)}>
                      Apagar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-6">
            <button className="btn btn-outline" onClick={() => load(false)} disabled={loading || end}>
              {end ? "Não há mais" : loading ? "A carregar…" : "Carregar mais"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
