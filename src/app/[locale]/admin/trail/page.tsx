"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";
import { UploadCloud, Trash2 } from "lucide-react";
import { useUploadProgress } from "@/components/admin/UploadProgressContext";

type TrailImage = { id: string; imageUrl: string; order?: number | null };

async function fetchTrailImages(token: string): Promise<TrailImage[]> {
  const res = await fetch("/api/trail-images/list", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Falha (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data.items) ? (data.items as TrailImage[]) : [];
}

async function uploadAndCreate({ file, token }: { file: File; token: string }) {
  const form = new FormData();
  form.append("file", file);
  form.append("name", file.name || "trail");
  const uploadRes = await fetch("/api/highlights/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!uploadRes.ok) {
    const data = await uploadRes.json().catch(() => ({}));
    throw new Error(data?.error || `Falha (${uploadRes.status}) no upload.`);
  }
  const uploadData = await uploadRes.json();
  const imageUrl = uploadData.imageUrl as string;

  const createRes = await fetch("/api/trail-images/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageUrl }),
  });
  if (!createRes.ok) {
    const data = await createRes.json().catch(() => ({}));
    throw new Error(data?.error || `Falha (${createRes.status}) ao registar imagem.`);
  }
}

async function deleteTrailImage({ id, token }: { id: string; token: string }) {
  const res = await fetch("/api/trail-images/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Falha (${res.status}) ao remover.`);
  }
}

export default function TrailAdminPage() {
  const [items, setItems] = useState<TrailImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type?: "success" | "error" | "warning" | "info";
    message: string;
    actions?: { label: string; onClick: () => void; variant?: "primary" | "ghost" }[];
  } | null>(null);
  const { state: globalUpload, setUploadProgress, clearUpload } = useUploadProgress();
  const uploadScope = "trail-upload";
  const globalLock = !!globalUpload && globalUpload.progress < 1;

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const primaryButton =
    "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";
  const ghostButton =
    "inline-flex items-center justify-center rounded-full border border-white/25 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-40";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Precisas de iniciar sessão.");
      const data = await fetchTrailImages(token);
      setItems(data);
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar imagens.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 1) {
      setError("Seleciona apenas um ficheiro de cada vez.");
      setSuccess(null);
      e.target.value = "";
      return;
    }
    const file = files?.[0];
    if (!file) return;
    if (globalLock) {
      setError("Já existe um envio em curso. Aguarda terminar para enviar mais imagens.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Precisas de iniciar sessão.");
      setUploadProgress({ label: "Trilho de imagens", progress: 0, scope: uploadScope });
      await uploadAndCreate({ file, token });
      setSuccess("Imagem adicionada ao trilho de imagens.");
      setUploadProgress({ label: "Trilho de imagens", progress: 1, scope: uploadScope });
      await load();
    } catch (err: any) {
      setError(err?.message || "Falha ao adicionar imagem.");
    } finally {
      setUploading(false);
      clearUpload();
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    setToast({
      type: "warning",
      message: "Remover esta imagem do trilho de imagens?",
      actions: [
        { label: "Cancelar", onClick: () => setToast(null) },
        {
          label: "Remover",
          variant: "primary",
          onClick: async () => {
            setToast(null);
            try {
              const token = await auth.currentUser?.getIdToken();
              if (!token) throw new Error("Precisas de iniciar sessão.");
              await deleteTrailImage({ id, token });
              setSuccess("Imagem removida.");
              await load();
            } catch (err: any) {
              setError(err?.message || "Falha ao remover.");
            }
          },
        },
      ],
    });
  }

  return (
    <div className="space-y-8">
      {toast ? <AdminNotification type={toast.type} message={toast.message} actions={toast.actions} onClose={() => setToast(null)} /> : null}
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Admin</p>
        <h1 className="text-4xl font-semibold text-white tracking-tight">Trilho de imagens</h1>
        <p className="text-sm text-white/70">Seleciona as imagens que aparecem no trilho de imagens.</p>
      </header>

      <section className={cardClass}>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Adicionar</p>
            <p className="text-sm text-white/70">Faz upload de uma nova imagem. Sem limite de quantidade.</p>
          </div>
          <label className="block rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white/80 cursor-pointer">
            <div className="flex items-center gap-2">
              <UploadCloud size={16} />
              <span>{uploading ? "A enviar…" : "Escolher imagem"}</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading || globalLock} />
          </label>
          {error && <p className="text-rose-200 text-sm">{error}</p>}
          {success && <p className="text-emerald-200 text-sm">{success}</p>}
        </div>
      </section>

      <section className={cardClass}>
        <div className="space-y-4 p-6">
          <div className="text-sm uppercase tracking-[0.35em] text-white/60">Imagens atuais</div>
          {loading ? (
            <div className="text-white/70 text-sm">A carregar...</div>
          ) : items.length === 0 ? (
            <div className="text-white/70 text-sm">Nenhuma imagem no trilho de imagens.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.id} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={`${ghostButton} gap-2 text-rose-200 hover:text-rose-100`}
                      onClick={() => handleDelete(item.id)}
                      disabled={uploading}
                    >
                      <Trash2 size={14} />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
