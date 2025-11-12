"use client";

import { useEffect, useState } from "react";

type Category = { id: string; name: string; description?: string|null; active: boolean; createdAt?: number };

export default function CategoriesAdminPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); 
  const [description, setDescription] = useState("");

  async function load() {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const data = await res.json();
    setItems((data.items || []) as Category[]);
  }

  useEffect(() => { load(); }, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/categories/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    });
    setBusy(false);
    if (res.ok) { setName(""); setDescription(""); load(); } else { alert("Falha ao criar categoria."); }
  }

  async function toggleActive(id: string, active: boolean) {
    setBusy(true);
    const res = await fetch("/api/categories/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch: { active } }),
    });
    setBusy(false);
    if (res.ok) load(); else alert("Falha ao atualizar.");
  }

  async function remove(id: string) {
    if (!confirm("Apagar esta categoria?")) return;
    setBusy(true);
    const res = await fetch("/api/categories/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (res.ok) load(); else alert("Falha ao apagar.");
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="text-sm text-gray-500">Cria, ativa/desativa e remove categorias do portfólio.</p>
      </header>

      <section className="bg-white rounded-xl shadow-sm border">
        <form onSubmit={createCategory} className="p-4 grid gap-3 md:grid-cols-3">
          <input
            className="input input-bordered w-full md:col-span-1"
            placeholder="Nome da categoria"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            required
          />
          <input
            className="input input-bordered w-full md:col-span-1"
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
          />
          <button className="btn btn-primary md:col-span-1" disabled={busy || !name.trim()}>
            {busy ? "A guardar…" : "Criar"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b font-medium">Lista</div>
        <div className="divide-y">
          {items.length === 0 ? (
            <div className="p-6 text-gray-500">Sem categorias.</div>
          ) : items.map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                {c.description ? <div className="text-sm text-gray-500">{c.description}</div> : null}
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${c.active ? "badge-success" : ""}`}>{c.active ? "Ativa" : "Inativa"}</span>
                <button className="btn btn-sm" onClick={() => toggleActive(c.id, !c.active)} disabled={busy}>
                  {c.active ? "Desativar" : "Ativar"}
                </button>
                <button className="btn btn-sm btn-outline btn-error" onClick={() => remove(c.id)} disabled={busy}>
                  Apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
