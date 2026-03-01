"use client";

import { useEffect, useRef, useState } from "react";
import { auth, storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AdminNotification } from "@/components/admin/Notification";
import { ImagePlus, Eye, EyeOff, Trash2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  coverUrl?: string | null;
  showInPortfolio?: boolean;
  createdAt?: number;
};

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken();
}

export default function CategoriesAdminPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    actions?: {
      label: string;
      onClick: () => void;
      variant?: "primary" | "ghost";
    }[];
  } | null>(null);

  async function load() {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const data = await res.json();
    setItems((data.items || []) as Category[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadCover(file: File, categoryId: string): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `categories/${categoryId}/cover.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/categories/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        load();
        setToast({ type: "success", message: "Categoria criada com sucesso." });
      } else {
        setToast({ type: "error", message: "Falha ao criar categoria." });
      }
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Falha ao criar categoria.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleCoverUpload(cat: Category, file: File) {
    setBusy(true);
    try {
      const url = await uploadCover(file, cat.id);
      const token = await getIdToken();
      await fetch("/api/categories/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: cat.id, patch: { coverUrl: url } }),
      });
      load();
      setToast({ type: "success", message: "Capa atualizada." });
    } catch (err: any) {
      console.error("Cover upload failed:", err);
      setToast({
        type: "error",
        message: err?.message || "Falha ao carregar imagem.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function togglePortfolio(id: string, show: boolean) {
    setBusy(true);
    const token = await getIdToken();
    const res = await fetch("/api/categories/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, patch: { showInPortfolio: show } }),
    });
    setBusy(false);
    if (res.ok) {
      load();
      setToast({
        type: "success",
        message: show ? "Visível no portfólio." : "Removida do portfólio.",
      });
    } else {
      setToast({ type: "error", message: "Falha ao atualizar." });
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setBusy(true);
    const token = await getIdToken();
    const res = await fetch("/api/categories/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, patch: { active } }),
    });
    setBusy(false);
    if (res.ok) {
      load();
      setToast({ type: "success", message: "Categoria atualizada." });
    } else {
      setToast({ type: "error", message: "Falha ao atualizar." });
    }
  }

  function confirmRemove(id: string) {
    setToast({
      type: "warning",
      message: "Apagar esta categoria? Esta ação não pode ser desfeita.",
      actions: [
        { label: "Cancelar", onClick: () => setToast(null) },
        {
          label: "Apagar",
          variant: "primary",
          onClick: async () => {
            setToast(null);
            setBusy(true);
            const token = await getIdToken();
            const res = await fetch("/api/categories/delete", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ id }),
            });
            setBusy(false);
            if (res.ok) {
              load();
              setToast({ type: "success", message: "Categoria apagada." });
            } else {
              setToast({ type: "error", message: "Falha ao apagar." });
            }
          },
        },
      ],
    });
  }

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const inputClass =
    "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white/50 focus:outline-none";
  const primaryBtn =
    "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-5 py-2 text-sm font-semibold transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
  const subtleBtn =
    "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50";
  const dangerBtn =
    "rounded-full border border-red-400/70 px-4 py-1.5 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300";

  return (
    <div className="space-y-10">
      {toast ? (
        <AdminNotification
          type={toast.type}
          message={toast.message}
          actions={toast.actions}
          onClose={() => setToast(null)}
        />
      ) : null}
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Admin
        </p>
        <h1 className="text-4xl font-semibold text-white tracking-tight">
          Categorias
        </h1>
        <p className="text-sm text-white/70">
          Cria, ativa/desativa e organiza as categorias do portfólio.
        </p>
      </header>

      <section className={cardClass}>
        <form
          onSubmit={createCategory}
          className="grid gap-4 p-6 sm:grid-cols-3"
        >
          <input
            className={`${inputClass} sm:col-span-1`}
            placeholder="Nome da categoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className={`${inputClass} sm:col-span-1`}
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            className={`${primaryBtn} sm:col-span-1`}
            disabled={busy || !name.trim()}
          >
            {busy ? "A guardar…" : "Criar categoria"}
          </button>
        </form>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-white/60">
              Lista
            </div>
            <div className="text-lg font-semibold text-white">
              {items.length} categorias
            </div>
          </div>
          <div className="text-xs text-white/50">
            Atualiza ou remove categorias rapidamente
          </div>
        </div>
        <div className="divide-y divide-white/10">
          {items.length === 0 ? (
            <div className="p-6 text-center text-white/60">
              Sem categorias ainda. Cria a primeira acima.
            </div>
          ) : (
            items.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  {/* Cover thumbnail */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {c.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.coverUrl}
                        alt={c.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/30">
                        <ImagePlus size={18} />
                      </div>
                    )}
                    {/* Hidden file input for cover */}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCoverUpload(c, file);
                        e.target.value = "";
                      }}
                      disabled={busy}
                      title="Carregar capa"
                    />
                  </div>
                  <div>
                    <div className="text-base font-medium text-white">
                      {c.name}
                    </div>
                    {c.description ? (
                      <div className="text-sm text-white/60">
                        {c.description}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Portfolio visibility badge + toggle */}
                  <button
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition ${
                      c.showInPortfolio
                        ? "bg-blue-500/20 text-blue-200 border border-blue-400/50 hover:bg-blue-500/30"
                        : "border border-white/20 text-white/50 hover:border-white/40"
                    }`}
                    onClick={() => togglePortfolio(c.id, !c.showInPortfolio)}
                    disabled={busy}
                    title={
                      c.showInPortfolio
                        ? "Remover do portfólio"
                        : "Mostrar no portfólio"
                    }
                  >
                    {c.showInPortfolio ? (
                      <Eye size={12} />
                    ) : (
                      <EyeOff size={12} />
                    )}
                    {c.showInPortfolio ? "Portfólio" : "Oculta"}
                  </button>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                      c.active
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/50"
                        : "border border-white/20 text-white/60"
                    }`}
                  >
                    {c.active ? "Ativa" : "Inativa"}
                  </span>
                  <button
                    className={subtleBtn}
                    onClick={() => toggleActive(c.id, !c.active)}
                    disabled={busy}
                  >
                    {c.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    className={dangerBtn}
                    onClick={() => confirmRemove(c.id)}
                    disabled={busy}
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
