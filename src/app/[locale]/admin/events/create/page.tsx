"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";
import { useUploadProgress } from "@/components/admin/UploadProgressContext";
import { UploadCloud } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];

export default function CreateEventPage() {
  const locale = useLocale();
  const router = useRouter();
  const {
    state: globalUpload,
    setUploadProgress,
    clearUpload,
  } = useUploadProgress();
  const uploadScope = "event-cover-upload";
  const globalLock = !!globalUpload && globalUpload.progress < 1;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [pricePerPhoto, setPricePerPhoto] = useState("1.50");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  const cardClass = useMemo(
    () =>
      "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm",
    [],
  );
  const inputBase = useMemo(
    () =>
      "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white/50 focus:outline-none disabled:opacity-50",
    [],
  );
  const primaryButton =
    "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/90 disabled:opacity-40";

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setToast({ type: "error", message: "Formato de imagem não suportado." });
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (globalLock) {
      setToast({ type: "warning", message: "Existe outro upload em curso." });
      return;
    }
    if (!title.trim() || !date || !coverFile) return;

    setBusy(true);
    setToast(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessão expirada.");

      setUploadProgress({
        label: "Capa do evento",
        progress: 0.1,
        scope: uploadScope,
      });

      // 1) Upload da capa (comprimir para respeitar o limite de 4.5 MB do Vercel)
      const compressed = await compressImage(coverFile, {
        maxSizeMB: 4,
        maxWidth: 2400,
        maxHeight: 2400,
      });
      const form = new FormData();
      form.append("file", compressed);
      form.append("type", "cover");
      form.append("name", coverFile.name);

      const uploadRes = await fetch("/api/events/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!uploadRes.ok) {
        const payload = await uploadRes.json().catch(() => ({}));
        throw new Error(payload?.error || "Falha no upload da capa.");
      }
      const uploadData = await uploadRes.json();

      setUploadProgress({
        label: "Capa do evento",
        progress: 0.7,
        scope: uploadScope,
      });

      // 2) Criar evento
      const createRes = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          coverUrl: uploadData.imageUrl,
          date,
          pricePerPhoto: parseFloat(pricePerPhoto) || 0,
          description: description.trim() || null,
        }),
      });
      if (!createRes.ok) {
        const payload = await createRes.json().catch(() => ({}));
        throw new Error(payload?.error || "Falha ao criar evento.");
      }

      setUploadProgress({
        label: "Capa do evento",
        progress: 1,
        scope: uploadScope,
      });
      clearUpload();

      setToast({ type: "success", message: "Evento criado com sucesso!" });
      setTimeout(() => {
        router.push(`/${locale}/admin/events`);
      }, 1200);
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Erro ao criar evento.",
      });
      clearUpload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      {toast && (
        <AdminNotification
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Admin
        </p>
        <h1 className="text-4xl font-semibold text-white tracking-tight">
          Criar evento
        </h1>
        <p className="text-sm text-white/70">
          Preenche os dados do evento. Depois poderás adicionar fotos na página
          de detalhe.
        </p>
      </header>

      <section className={cardClass}>
        <form className="space-y-6 p-6" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white/60">
                Título *
              </span>
              <input
                className={inputBase}
                placeholder="Ex.: Casamento Ana & João"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={busy}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white/60">
                Data *
              </span>
              <input
                type="date"
                className={inputBase}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={busy}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white/60">
                Preço por foto (€)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputBase}
                placeholder="1.50"
                value={pricePerPhoto}
                onChange={(e) => setPricePerPhoto(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white/60">
                Descrição (opcional)
              </span>
              <input
                className={inputBase}
                placeholder="Breve descrição do evento"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs uppercase tracking-[0.25em] text-white/60">
              Capa do evento *
            </span>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-gray-900 hover:border-white/40"
              onChange={handleCoverChange}
              disabled={busy}
              required
            />
          </label>

          {coverPreview && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="Preview da capa"
                className="h-48 w-full rounded-xl object-cover"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className={primaryButton}
              disabled={
                busy || !title.trim() || !date || !coverFile || globalLock
              }
            >
              {busy ? (
                "A criar…"
              ) : (
                <>
                  <UploadCloud size={16} className="mr-2" />
                  Criar evento
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
