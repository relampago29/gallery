"use client";

import { useEffect, useMemo, useState } from "react";
import { Highlight, fetchHighlights } from "@/lib/highlights";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";
import { UploadCloud, ImagePlus } from "lucide-react";
import { useUploadProgress } from "@/components/admin/UploadProgressContext";

const ALLOWED_HIGHLIGHT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;
const MAX_HIGHLIGHT_SIZE = 4 * 1024 * 1024; // ajustado para o limite da lambda na Vercel

const emptyForm = {
  imageUrl: "",
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
  const [uploadProgressValue, setUploadProgressValue] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    type?: "success" | "error" | "warning" | "info";
    message: string;
    actions?: { label: string; onClick: () => void; variant?: "primary" | "ghost" }[];
  } | null>(null);
  const { state: globalUpload, setUploadProgress: setGlobalUploadProgress, clearUpload } = useUploadProgress();
  const uploadScope = "highlights-upload";
  const globalLock = !!globalUpload && globalUpload.progress < 1;

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const inputBase =
    "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white/50 focus:outline-none disabled:opacity-50";
  const primaryButton =
    "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";
  const ghostButton =
    "inline-flex items-center justify-center rounded-full border border-white/25 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40";

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
      setError("Faz upload da imagem antes de guardar.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await callAuthorized("/api/highlights/create", {
        imageUrl: form.imageUrl,
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

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function retry<T>(fn: () => Promise<T>, attempts: number, baseDelay: number): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i === attempts - 1) break;
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  async function uploadHighlightImage(file: File) {
    if (globalLock) {
      throw new Error("Já existe um envio em curso. Aguarda antes de carregar novas imagens.");
    }
    const tokenUser = auth.currentUser;
    if (!tokenUser) {
      throw new Error("Precisas de iniciar sessão.");
    }
    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error("Apenas imagens são permitidas.");
    }
    if (file.size > MAX_HIGHLIGHT_SIZE) {
      throw new Error("Imagem demasiado grande (limite ~4MB). Comprime ou reduz a resolução.");
    }
    if (ALLOWED_HIGHLIGHT_TYPES.length && !ALLOWED_HIGHLIGHT_TYPES.includes(file.type.toLowerCase())) {
      throw new Error("Formato não suportado. Usa JPG, PNG, WEBP, AVIF ou HEIC.");
    }

    const token = await tokenUser.getIdToken();
    return retry(
      async () => {
        setUploadProgressValue(0);
        setGlobalUploadProgress({ label: "Destaques", progress: 0, scope: uploadScope });
        const form = new FormData();
        form.append("file", file);
        form.append("name", file.name || "highlight");
        const res = await fetch("/api/highlights/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Falha (${res.status}) no upload.`);
        }
        const data = await res.json();
        setUploadProgressValue(100);
        setGlobalUploadProgress({ label: "Destaques", progress: 1, scope: uploadScope });
        return data.imageUrl as string;
      },
      RETRY_ATTEMPTS,
      RETRY_DELAY_MS
    );
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (globalLock) {
      setError("Já existe um envio em curso. Aguarda antes de carregar novas imagens.");
      e.target.value = "";
      return;
    }
    setUploadingImage(true);
    setUploadProgressValue(0);
    setError(null);
    try {
      const url = await uploadHighlightImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      setSuccess("Imagem carregada com sucesso. Confirma os restantes detalhes antes de guardar.");
    } catch (err: any) {
      setError(err?.message || "Falha ao subir imagem.");
    } finally {
      setUploadingImage(false);
      setUploadProgressValue(null);
      clearUpload();
      e.target.value = "";
    }
  }

  async function handleReplaceImage(itemId: string, file: File) {
    if (globalLock) {
      setError("Já existe um envio em curso. Aguarda antes de carregar novas imagens.");
      return;
    }
    setUploadingImage(true);
    setUploadProgressValue(0);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadHighlightImage(file);
      setItems((prev) => prev.map((p) => (p.id === itemId ? { ...p, imageUrl: url } : p)));
      setEditingId(itemId);
      setSuccess("Nova imagem carregada. Clica em Guardar para aplicar.");
    } catch (err: any) {
      setError(err?.message || "Falha ao substituir imagem.");
    } finally {
      setUploadingImage(false);
      setUploadProgressValue(null);
      clearUpload();
    }
  }

  async function handleUpdate(item: Highlight) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await callAuthorized("/api/highlights/update", {
        id: item.id,
        imageUrl: item.imageUrl,
        order: item.order ?? Date.now(),
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
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Admin</p>
        <h1 className="text-4xl font-semibold text-white tracking-tight">Destaques</h1>
        <p className="text-sm text-white/70">Envia as imagens em destaque da página inicial (máx. 12).</p>
      </header>

      <section className={cardClass}>
        <form onSubmit={handleCreate} className="space-y-5 p-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Novo destaque</p>
            <p className="text-sm text-white/70">Carrega uma imagem ou usa um URL já existente.</p>
          </div>

          <div className="space-y-3">
            <label className="block rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white/80">
              <div className="flex flex-col gap-3">
                <span className="inline-flex items-center gap-2 text-white">
                  <UploadCloud size={16} /> Imagem (JPG/PNG/WEBP/AVIF/HEIC)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-gray-900 hover:border-white/40"
                  onChange={handleFileInput}
                  disabled={uploadingImage || globalLock}
                />
                {uploadProgressValue !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>Envio</span>
                      <span>{uploadProgressValue}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, uploadProgressValue))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>

            {form.imageUrl && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="Pré-visualização" className="h-48 w-full object-cover" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className={primaryButton} type="submit" disabled={!canAddMore || saving || uploadingImage || globalLock}>
              {saving ? "A guardar..." : "Adicionar destaque"}
            </button>
            {!canAddMore && <p className="text-xs text-rose-300">Máximo de 12 destaques. Remove um antes de adicionar.</p>}
          </div>

          {error && <p className="text-rose-200 text-sm">{error}</p>}
          {success && <p className="text-emerald-200 text-sm">{success}</p>}
        </form>
      </section>

      <section className="space-y-4">
        <div className="text-sm uppercase tracking-[0.35em] text-white/60">Destaques atuais</div>
        {loading ? (
          <div className="text-white/70 text-sm">A carregar...</div>
        ) : items.length === 0 ? (
          <div className="text-white/70 text-sm">Nenhum destaque configurado.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className={`${cardClass} space-y-3 p-4`}>
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                {editingId === item.id ? (
                  <div className="space-y-3 text-sm text-white/80">
                    <div className="flex items-center gap-3">
                      <label className={`${ghostButton} cursor-pointer gap-2`}>
                        <ImagePlus size={16} />
                        <span>Substituir imagem</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const newFile = e.target.files?.[0];
                            if (newFile) {
                              handleReplaceImage(item.id, newFile);
                            }
                            e.target.value = "";
                          }}
                          disabled={uploadingImage || globalLock}
                        />
                      </label>
                      {uploadProgressValue !== null && uploadingImage && (
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[11px] text-white/60">
                            <span>Envio</span>
                            <span>{uploadProgressValue}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-white transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, uploadProgressValue))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`${primaryButton} flex-1`}
                        onClick={() => editingItem && handleUpdate(editingItem)}
                        disabled={saving || globalLock}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className={`${ghostButton} flex-1`}
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-white">
                    <div className="font-semibold">&nbsp;</div>
                    <div className="text-xs text-white/70">Altura: {item.height}px</div>
                    <div className="flex gap-2 pt-1">
                      <button className={`${ghostButton} flex-1`} onClick={() => setEditingId(item.id)} disabled={globalLock}>
                        Editar
                      </button>
                      <button
                        className={`${primaryButton} flex-1 bg-rose-500 text-white hover:bg-rose-400`}
                        onClick={() => handleDelete(item.id)}
                        disabled={globalLock}
                      >
                        <span className="text-gray-900">Remover</span>
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
