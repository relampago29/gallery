"use client";

import { useEffect, useMemo, useState } from "react";
import { Highlight, fetchHighlights } from "@/lib/highlights";
import { auth, storage } from "@/lib/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { AdminNotification } from "@/components/admin/Notification";

const emptyForm = {
  title: "",
  imageUrl: "",
  height: 420,
  description: "",
};

export default function HighlightsAdminPage() {
  const [items, setItems] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    type?: "success" | "error" | "warning" | "info";
    message: string;
    actions?: { label: string; onClick: () => void; variant?: "primary" | "ghost" }[];
  } | null>(null);

  async function loadHighlights() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHighlights();
      setItems(data);
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar destaques.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHighlights();
  }, []);

  const canAddMore = items.length < 12;

  async function callAuthorized(endpoint: string, body: Record<string, unknown>) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Precisas de iniciar sessão para continuar.");
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Falha (${res.status})`);
    }
    return res.json().catch(() => ({}));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canAddMore) {
      setError("Já existem 12 destaques.");
      return;
    }
    if (!form.imageUrl.trim()) {
      setError("Indica o URL da imagem.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await callAuthorized("/api/highlights/create", {
        title: form.title,
        imageUrl: form.imageUrl,
        height: Number(form.height),
        description: form.description,
      });
      setForm(emptyForm);
      setSuccess("Destaque adicionado com sucesso.");
      await loadHighlights();
    } catch (err: any) {
      setError(err?.message || "Falha ao adicionar.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadHighlightImage(file: File) {
    const tokenUser = auth.currentUser;
    if (!tokenUser) {
      throw new Error("Precisas de iniciar sessão.");
    }
    const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString();
    const safeName = file.name?.replace(/\s+/g, "-").toLowerCase() || "highlight";
    const storagePath = `masters/highlights/${uuid}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    const metadata = { contentType: file.type || "image/jpeg" };

    return new Promise<string>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, metadata);
      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setUploadProgress(0);
    setError(null);
    try {
      const url = await uploadHighlightImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      setSuccess("Imagem carregada com sucesso. Confirma os restantes detalhes antes de guardar.");
    } catch (err: any) {
      setError(err?.message || "Falha ao subir imagem.");
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  }

  async function handleUpdate(item: Highlight) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await callAuthorized("/api/highlights/update", {
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        height: item.height,
        order: item.order ?? Date.now(),
        description: item.description ?? null,
      });
      setSuccess("Destaque atualizado.");
      setEditingId(null);
      await loadHighlights();
    } catch (err: any) {
      setError(err?.message || "Falha ao atualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!id) return;
    setToast({
      type: "warning",
      message: "Remover este destaque?",
      actions: [
        { label: "Cancelar", onClick: () => setToast(null) },
        {
          label: "Remover",
          variant: "primary",
          onClick: async () => {
            setToast(null);
            setSaving(true);
            setError(null);
            setSuccess(null);
            try {
              await callAuthorized("/api/highlights/delete", { id });
              setSuccess("Destaque removido.");
              await loadHighlights();
            } catch (err: any) {
              setError(err?.message || "Falha ao remover.");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    });
  }

  const editingItem = useMemo(() => items.find((it) => it.id === editingId) || null, [editingId, items]);

  return (
    <div className="space-y-8">
      {toast ? <AdminNotification type={toast.type} message={toast.message} actions={toast.actions} onClose={() => setToast(null)} /> : null}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Highlights</h1>
        <p className="text-sm text-white/70">Define as imagens em destaque utilizadas na página inicial (máx. 12).</p>
      </header>

      <form onSubmit={handleCreate} className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/80">Novo destaque</div>
        <label className="block rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white">
          <div className="flex flex-col gap-2">
            <span>Imagem (upload ou URL existente)</span>
            <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={handleFileInput} disabled={uploadingImage} />
            {uploadProgress !== null && (
              <div className="text-xs text-white/70">
                Upload: {uploadProgress}%
              </div>
            )}
          </div>
        </label>
        <input
          className="input input-bordered w-full"
          type="text"
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />
        <input
          className="input input-bordered w-full"
          type="url"
          placeholder="URL da imagem"
          value={form.imageUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
          disabled={uploadingImage}
        />
        <input
          className="input input-bordered w-full"
          type="number"
          min={220}
          max={700}
          placeholder="Altura (px)"
          value={form.height}
          onChange={(e) => setForm((prev) => ({ ...prev, height: Number(e.target.value) }))}
        />
        <textarea
          className="textarea textarea-bordered w-full"
          placeholder="Descrição (opcional)"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
        <button className="btn btn-primary" type="submit" disabled={!canAddMore || saving}>
          {saving ? "A guardar..." : "Adicionar"}
        </button>
        {!canAddMore && <p className="text-xs text-red-400">Máximo de 12 destaques. Remove um antes de adicionar.</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-emerald-400 text-sm">{success}</p>}
      </form>

      <section className="space-y-4">
        <div className="text-sm uppercase tracking-[0.35em] text-white/60">Destaques atuais</div>
        {loading ? (
          <div className="text-white/70 text-sm">A carregar...</div>
        ) : items.length === 0 ? (
          <div className="text-white/70 text-sm">Nenhum destaque configurado.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                </div>
                {editingId === item.id ? (
                  <div className="space-y-2 text-sm text-white/80">
                    <input
                      className="input input-bordered w-full text-black"
                      value={editingItem?.title || ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p) => (p.id === item.id ? { ...p, title: e.target.value } : p))
                        )
                      }
                    />
                    <input
                      className="input input-bordered w-full text-black"
                      value={editingItem?.imageUrl || ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p) => (p.id === item.id ? { ...p, imageUrl: e.target.value } : p))
                        )
                      }
                    />
                    <input
                      className="input input-bordered w-full text-black"
                      type="number"
                      min={220}
                      max={700}
                      value={editingItem?.height || 400}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p) => (p.id === item.id ? { ...p, height: Number(e.target.value) } : p))
                        )
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary flex-1"
                        onClick={() => editingItem && handleUpdate(editingItem)}
                        disabled={saving}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm flex-1"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-white">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-xs text-white/70">Altura: {item.height}px</div>
                    <div className="flex gap-2 pt-1">
                      <button className="btn btn-sm btn-outline flex-1" onClick={() => setEditingId(item.id)}>
                        Editar
                      </button>
                      <button className="btn btn-sm btn-error flex-1" onClick={() => handleDelete(item.id)}>
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
