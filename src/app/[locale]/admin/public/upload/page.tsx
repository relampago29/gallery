"use client";

import { useEffect, useMemo, useState } from "react";
import { listActiveCategories } from "@/lib/categories";
import { uploadMasterAndCreateProcessingDoc } from "@/lib/publicPhotos";
import { useUploadProgress } from "@/components/admin/UploadProgressContext";

const parsedConcurrency = Number(process.env.NEXT_PUBLIC_UPLOAD_CONCURRENCY);
const MAX_PARALLEL_UPLOADS =
  Number.isFinite(parsedConcurrency) && parsedConcurrency > 0 ? Math.min(10, parsedConcurrency) : 3;

type UploadResult = {
  ok: boolean;
  fileName: string;
  sequenceNumber: number;
  error?: string;
};

function buildSequentialLabel(sequenceNumber: number, base?: string | null) {
  const safeBase = base && base.trim().length ? base.trim() : "Foto";
  return `${safeBase} ${sequenceNumber}`;
}

async function runWithConcurrency(
  tasks: { fn: () => Promise<void>; fileName: string; sequenceNumber: number }[],
  limit = MAX_PARALLEL_UPLOADS,
  onProgress?: (completed: number) => void
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
        results[current] = { ok: true, fileName: task.fileName, sequenceNumber: task.sequenceNumber };
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

async function reserveSequenceNumbers(count: number) {
  const res = await fetch("/api/upload/sequence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "public", count }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Falha (${res.status}) ao reservar numeração.`);
  }
  const data = await res.json();
  const start = Number(data?.start) || 1;
  return start;
}

export default function UploadPublicPhotoPage() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failedUploads, setFailedUploads] = useState<UploadResult[]>([]);
  const { state: globalUpload, setUploadProgress, clearUpload } = useUploadProgress();
  const uploadScope = "public-upload";
  const globalLock = !!globalUpload && globalUpload.progress < 1;

  useEffect(() => {
    (async () => {
      const c = await listActiveCategories();
      setCats(c.map((x) => ({ id: x.id, name: x.name })));
      if (c.length) setCategoryId(c[0].id);
    })();
  }, []);

  const cardClass = useMemo(
    () => "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm",
    []
  );
  const inputBase = useMemo(
    () =>
      "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white/50 focus:outline-none disabled:opacity-50",
    []
  );
  const selectBase = `${inputBase} appearance-none`;
  const primaryButton = useMemo(
    () =>
      "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40",
    []
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (globalLock && !busy) {
      setMsg("Existe outro upload em curso. Aguarda que termine antes de iniciar outro.");
      return;
    }
    if (!categoryId || files.length === 0) return;
    setBusy(true);
    setProgress(0);
    setMsg(null);
    setFailedUploads([]);
    try {
      setUploadProgress({ label: "Portfólio público", progress: 0, scope: uploadScope });
      const start = await reserveSequenceNumbers(files.length);
      const total = files.length;
      const tasks = files.map((f, index) => {
        const sequenceNumber = start + index;
        const generatedTitle = buildSequentialLabel(sequenceNumber, title);
        const generatedAlt = buildSequentialLabel(sequenceNumber, alt ?? title);
        return {
          fileName: f.name,
          sequenceNumber,
          fn: async () => {
            await uploadMasterAndCreateProcessingDoc({
              file: f,
              categoryId,
              title: generatedTitle,
              alt: generatedAlt,
              sequenceNumber,
            });
          },
        };
      });
      const results = await runWithConcurrency(tasks, MAX_PARALLEL_UPLOADS, (done) => {
        const value = total ? done / total : 0;
        setProgress(value);
        setUploadProgress({ label: "Portfólio público", progress: value, scope: uploadScope });
      });
      const failures = results.filter((r) => !r.ok);
      setFailedUploads(failures);
      const successCount = results.length - failures.length;
      setMsg(
        `${successCount} ficheiro(s) enviados para o portfólio público. ${
          failures.length ? `${failures.length} falharam.` : "As variantes serão geradas automaticamente."
        }`
      );
      setFiles([]);
      setTitle("");
      setAlt("");
      clearUpload();
    } catch (e: any) {
      setMsg("Erro: " + (e?.message || String(e)));
      clearUpload();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Admin</p>
        <h1 className="text-4xl font-semibold text-white tracking-tight">Carregar portfólio público</h1>
        <p className="text-sm text-white/70">Envie fotos para o portfólio público. As variantes serão geradas automaticamente.</p>
      </header>

      <section className={cardClass}>
        <form className="space-y-6 p-6" onSubmit={onSubmit}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">Categoria</span>
                <select className={selectBase} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">Título (opcional)</span>
                <input className={inputBase} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">Alt (opcional)</span>
                <input className={inputBase} placeholder="Texto alternativo" value={alt} onChange={(e) => setAlt(e.target.value)} />
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-xs uppercase tracking-[0.25em] text-white/60">Ficheiros</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="w-full rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-gray-900 hover:border-white/40"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                required
                disabled={busy || globalLock}
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              Selecionados: <span className="font-semibold text-white">{files.length}</span> ficheiro(s)
            </div>
          )}

          <div className="pt-2">
            <button className={primaryButton} disabled={busy || files.length === 0 || !categoryId || globalLock}>
              {busy ? "A enviar…" : "Guardar no portfólio"}
            </button>
          </div>
        </form>
        {msg && <div className="border-t border-white/10 px-6 py-4 text-sm text-white/80">{msg}</div>}
        {progress !== null && (
          <div className="border-t border-white/10 px-6 py-4">
            <div className="mb-2 text-xs uppercase tracking-[0.3em] text-white/60">Envio {Math.round(progress * 100)}%</div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {failedUploads.length > 0 && (
        <section className={cardClass}>
          <div className="space-y-4 px-6 py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Resumo</p>
              <h3 className="text-2xl font-semibold text-white">Falharam {failedUploads.length} ficheiro(s)</h3>
              <p className="text-sm text-white/70">Tenta novamente apenas estes itens. O progresso dos restantes ficou guardado.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5">
              <div className="grid grid-cols-1 gap-0 divide-y divide-white/10 text-sm text-white/80">
                {failedUploads.map((f, idx) => (
                  <div key={`${f.sequenceNumber}-${f.fileName}-${idx}`} className="grid gap-2 px-4 py-3 sm:grid-cols-3 sm:items-center">
                    <div className="font-mono text-xs text-white/60">#{f.sequenceNumber}</div>
                    <div className="break-words">{f.fileName}</div>
                    <div className="text-sm text-rose-200/80">{f.error || "Falha desconhecida"}</div>
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
