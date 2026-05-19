"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  uploadPrivateMaster,
  registerPrivateSessionPhoto,
} from "@/lib/publicPhotos";
import { useParams } from "next/navigation";
import { useUploadProgress } from "@/components/admin/UploadProgressContext";
import {
  UploadCloud,
  ImagePlus,
  X,
  CheckCircle2,
  AlertTriangle,
  FileImage,
} from "lucide-react";

const parsedConcurrency = Number(process.env.NEXT_PUBLIC_UPLOAD_CONCURRENCY);
const MAX_PARALLEL_UPLOADS =
  Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
    ? Math.min(10, parsedConcurrency)
    : 3;

type UploadResult = {
  ok: boolean;
  fileName: string;
  sequenceNumber: number;
  error?: string;
};

async function runWithConcurrency(
  tasks: {
    fn: () => Promise<void>;
    fileName: string;
    sequenceNumber: number;
  }[],
  limit = MAX_PARALLEL_UPLOADS,
  onProgress?: (completed: number) => void,
) {
  if (!tasks.length) return [] as UploadResult[];
  const poolSize = Math.max(1, Math.min(limit, tasks.length));
  let cursor = 0;
  let completed = 0;
  const results: UploadResult[] = new Array(tasks.length);

  const worker = async () => {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= tasks.length) break;
      const task = tasks[current];
      try {
        await task.fn();
        results[current] = {
          ok: true,
          fileName: task.fileName,
          sequenceNumber: task.sequenceNumber,
        };
      } catch (err: any) {
        results[current] = {
          ok: false,
          fileName: task.fileName,
          sequenceNumber: task.sequenceNumber,
          error: err?.message || String(err),
        };
      }
      completed += 1;
      onProgress?.(completed);
    }
  };

  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}

async function reserveSequenceNumbers(count: number, sessionId: string) {
  const res = await fetch("/api/upload/sequence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "private", count, sessionId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data?.error || `Falha (${res.status}) ao reservar numeração.`,
    );
  }
  const data = await res.json();
  return Number(data?.start) || 1;
}

export default function UploadPrivatePhotoPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || "";
  const sessionsPath = locale ? `/${locale}/sessions` : "/sessions";

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [ownerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [progress, setProgress] = useState<number | null>(null);
  const [failedUploads, setFailedUploads] = useState<UploadResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    state: globalUpload,
    setUploadProgress,
    clearUpload,
  } = useUploadProgress();
  const uploadScope = "private-upload";
  const globalLock = !!globalUpload && globalUpload.progress < 1;

  // Generate previews for selected files (max 8)
  useEffect(() => {
    if (files.length === 0) {
      setPreviews([]);
      return;
    }
    const urls: string[] = [];
    const limit = Math.min(files.length, 8);
    for (let i = 0; i < limit; i++) urls.push(URL.createObjectURL(files[i]));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const handleFiles = useCallback((incoming: FileList | File[]) => {
    const imageFiles = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (imageFiles.length > 0) setFiles(imageFiles);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (busy || globalLock) return;
      handleFiles(e.dataTransfer.files);
    },
    [busy, globalLock, handleFiles],
  );

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const inputBase =
    "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 transition";
  const primaryButton =
    "inline-flex items-center justify-center gap-2 rounded-full bg-white text-gray-900 px-8 py-3 text-sm font-semibold transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (globalLock && !busy) {
      setMsg(
        "Existe outro upload em curso. Aguarda que termine antes de iniciar outro.",
      );
      setMsgType("error");
      return;
    }
    if (files.length === 0) return;
    setBusy(true);
    setProgress(0);
    setMsg(null);
    setFailedUploads([]);
    const sessionCode = crypto.randomUUID();
    try {
      setUploadProgress({
        label: "Sessões privadas",
        progress: 0,
        scope: uploadScope,
      });
      setSavingSession(true);
      const resMeta = await fetch("/api/session-photos/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionCode,
          name: sessionName.trim(),
          ...(ownerEmail.trim() && { ownerEmail: ownerEmail.trim() }),
        }),
      });
      if (!resMeta.ok) {
        const data = await resMeta.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao preparar sessão.");
      }
      setSavingSession(false);

      const start = await reserveSequenceNumbers(files.length, sessionCode);
      const tasks = files.map((f, index) => {
        const sequenceNumber = start + index;
        const fileTitle = f.name.replace(/\.[^/.]+$/, "");
        return {
          fileName: f.name,
          sequenceNumber,
          fn: async () => {
            const { masterPath, createdAt } = await uploadPrivateMaster({
              file: f,
              sessionId: sessionCode,
            });
            await registerPrivateSessionPhoto({
              sessionId: sessionCode,
              masterPath,
              title: fileTitle,
              alt: fileTitle,
              createdAt,
              sequenceNumber,
            });
          },
        };
      });
      const total = files.length;
      const results = await runWithConcurrency(
        tasks,
        MAX_PARALLEL_UPLOADS,
        (done) => {
          const value = total ? done / total : 0;
          setProgress(value);
          setUploadProgress({
            label: "Sessões privadas",
            progress: value,
            scope: uploadScope,
          });
        },
      );
      const failures = results.filter((r) => !r.ok);
      setFailedUploads(failures);
      const successCount = results.length - failures.length;
      setMsg(
        `${successCount} ficheiro(s) enviados com sucesso. ${
          failures.length
            ? `${failures.length} falharam.`
            : "A sessão ficará disponível na área do cliente."
        }`,
      );
      setMsgType(failures.length ? "error" : "success");
      setFiles([]);
      clearUpload();
    } catch (e: any) {
      setMsg("Erro: " + (e?.message || String(e)));
      setMsgType("error");
      clearUpload();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const progressPercent = progress !== null ? Math.round(progress * 100) : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Admin
        </p>
        <h1 className="text-4xl font-semibold text-white tracking-tight">
          Criar sessão privada
        </h1>
        <p className="text-sm text-white/70">
          Envia fotos para uma sessão privada. O cliente acede automaticamente
          na sua área de sessões.
        </p>
      </header>

      <section className={cardClass}>
        <form className="divide-y divide-white/10" onSubmit={onSubmit}>
          {/* Step 1 — Session info */}
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                1
              </span>
              <h2 className="text-base font-semibold text-white">
                Dados da sessão
              </h2>
            </div>

            <div className="grid gap-4">
              <label className="space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                  Nome da sessão *
                </span>
                <input
                  className={inputBase}
                  placeholder="Ex.: Sessão Joana & Rui"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  required
                />
              </label>
            </div>
          </div>

          {/* Step 2 — File selection with drag & drop */}
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                2
              </span>
              <h2 className="text-base font-semibold text-white">
                Seleciona as fotos
              </h2>
            </div>

            {/* Drop zone */}
            <div
              className={`group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ${
                dragOver
                  ? "border-white/60 bg-white/10 scale-[1.01]"
                  : "border-white/20 bg-white/3 hover:border-white/40 hover:bg-white/6"
              } ${busy || globalLock ? "pointer-events-none opacity-50" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) =>
                  handleFiles(e.target.files || ([] as unknown as FileList))
                }
                disabled={busy || savingSession || globalLock}
              />
              <div className="flex flex-col items-center gap-3 px-6 py-10">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${
                    dragOver
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/60 group-hover:bg-white/15 group-hover:text-white/80"
                  }`}
                >
                  <ImagePlus size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white/80">
                    Arrasta as fotos para aqui
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    ou clica para selecionar · JPG, PNG, WEBP
                  </p>
                </div>
              </div>
            </div>

            {/* File previews */}
            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <FileImage size={14} />
                    <span>
                      <span className="font-semibold text-white">
                        {files.length}
                      </span>{" "}
                      ficheiro(s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="text-xs text-white/40 hover:text-white/70 transition"
                  >
                    Limpar tudo
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                  {previews.map((src, i) => (
                    <div
                      key={`preview-${i}`}
                      className="group/thumb relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={files[i]?.name || "preview"}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover/thumb:opacity-100"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {files.length > 8 && (
                    <div className="flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <span className="text-xs font-medium text-white/50">
                        +{files.length - 8}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          {progress !== null && (
            <div className="px-6 py-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">
                    {savingSession
                      ? "A preparar sessão…"
                      : "A enviar ficheiros…"}
                  </span>
                  <span className="font-mono text-white">
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-white/70 to-white transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-white/40">
                  {Math.round((progress ?? 0) * files.length)} de {files.length}{" "}
                  processados
                </p>
              </div>
            </div>
          )}

          {/* Message */}
          {msg && (
            <div className="px-6 py-4">
              <div
                className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${
                  msgType === "success"
                    ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    : "border border-red-400/30 bg-red-500/10 text-red-100"
                }`}
              >
                {msgType === "success" ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                )}
                <span>{msg}</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="px-6 py-5">
            <button
              type="submit"
              className={primaryButton}
              disabled={
                busy ||
                savingSession ||
                files.length === 0 ||
                !sessionName.trim() ||
                globalLock
              }
            >
              <UploadCloud size={16} />
              {busy ? "A enviar…" : "Guardar sessão privada"}
            </button>
          </div>
        </form>
      </section>

      {/* Instructions card */}
      <section className={cardClass}>
        <div className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Como funciona
            </p>
            <h3 className="text-2xl font-semibold text-white">
              Sessões privadas
            </h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <ol className="space-y-2.5 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">
                  1
                </span>
                <span>Dá um nome à sessão e faz upload das fotos.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">
                  2
                </span>
                <span>
                  O cliente faz login e vê a sessão automaticamente na sua área.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">
                  3
                </span>
                <span>
                  O cliente escolhe as fotos e efetua o pagamento (ou transfere
                  diretamente se tiver acesso grátis).
                </span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Failed uploads */}
      {failedUploads.length > 0 && (
        <section className={cardClass}>
          <div className="space-y-4 px-6 py-6">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-rose-300"
              />
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {failedUploads.length} ficheiro(s) falharam
                </h3>
                <p className="text-sm text-white/60">
                  Tenta novamente apenas estes itens. O progresso dos restantes
                  ficou guardado.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="divide-y divide-white/10 text-sm">
                {failedUploads.map((f, idx) => (
                  <div
                    key={`${f.sequenceNumber}-${f.fileName}-${idx}`}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <span className="font-mono text-xs text-white/40">
                      #{f.sequenceNumber}
                    </span>
                    <span className="flex-1 truncate text-white/80">
                      {f.fileName}
                    </span>
                    <span className="shrink-0 text-xs text-rose-300/80">
                      {f.error || "Falha desconhecida"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
