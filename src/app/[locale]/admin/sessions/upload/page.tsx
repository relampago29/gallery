"use client";

import { useMemo, useState } from "react";
import { uploadPrivateMaster, registerPrivateSessionPhoto } from "@/lib/publicPhotos";
import { useParams } from "next/navigation";
import { useUploadProgress } from "@/components/admin/UploadProgressContext";

function generateSessionCode() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

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

async function reserveSequenceNumbers(count: number, sessionId: string) {
  const res = await fetch("/api/upload/sequence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "private", count, sessionId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Falha (${res.status}) ao reservar numeração.`);
  }
  const data = await res.json();
  const start = Number(data?.start) || 1;
  return start;
}

export default function UploadPrivatePhotoPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || "";
  const sessionsPath = locale ? `/${locale}/sessions` : "/sessions";

  const [files, setFiles] = useState<File[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [sessionCode, setSessionCode] = useState<string>(() => generateSessionCode());
  const [lastSessionCode, setLastSessionCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failedUploads, setFailedUploads] = useState<UploadResult[]>([]);
  const { state: globalUpload, setUploadProgress, clearUpload } = useUploadProgress();
  const uploadScope = "private-upload";
  const globalLock = !!globalUpload && globalUpload.progress < 1;

  const cardClass = useMemo(
    () => "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm",
    []
  );
  const inputBase = useMemo(
    () =>
      "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white/50 focus:outline-none disabled:opacity-50",
    []
  );
  const primaryButton = useMemo(
    () =>
      "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40",
    []
  );
  const pillButton = useMemo(
    () =>
      "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 disabled:opacity-40",
    []
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (globalLock && !busy) {
      setMsg("Existe outro upload em curso. Aguarda que termine antes de iniciar outro.");
      return;
    }
    if (files.length === 0 || !sessionCode) return;
    setBusy(true);
    setProgress(0);
    setMsg(null);
    setFailedUploads([]);
    try {
      setUploadProgress({ label: "Sessões privadas", progress: 0, scope: uploadScope });
      setSavingSession(true);
      const resMeta = await fetch("/api/session-photos/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionCode,
          name: sessionName.trim() || sessionCode,
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
        const generatedTitle = buildSequentialLabel(sequenceNumber);
        return {
          fileName: f.name,
          sequenceNumber,
          fn: async () => {
            const { masterPath, createdAt } = await uploadPrivateMaster({ file: f, sessionId: sessionCode });
            await registerPrivateSessionPhoto({
              sessionId: sessionCode,
              masterPath,
              title: generatedTitle,
              alt: generatedTitle,
              createdAt,
              sequenceNumber,
            });
          },
        };
      });
      const total = files.length;
      const results = await runWithConcurrency(tasks, MAX_PARALLEL_UPLOADS, (done) => {
        const value = total ? done / total : 0;
        setProgress(value);
        setUploadProgress({ label: "Sessões privadas", progress: value, scope: uploadScope });
      });
      const failures = results.filter((r) => !r.ok);
      setFailedUploads(failures);
      const successCount = results.length - failures.length;
      setLastSessionCode(sessionCode);
      setMsg(
        `${successCount} ficheiro(s) enviados para "${sessionCode}". ${
          failures.length ? `${failures.length} falharam.` : "Partilha este código com o cliente para selecionar as fotos."
        }`
      );
      setFiles([]);
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
        <h1 className="text-4xl font-semibold text-white tracking-tight">Carregar sessões privadas</h1>
        <p className="text-sm text-white/70">
          Envia fotos para uma sessão privada e partilha o código com o cliente. O acesso público mantém-se em {sessionsPath}.
        </p>
      </header>

      <section className={cardClass}>
        <form className="space-y-6 p-6" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white/60">Nome da sessão</span>
              <input
                className={inputBase}
                placeholder="Ex.: Sessão Joana & Rui"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                required
              />
            </label>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] text-white/60">Código</span>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <span className="text-xs text-white/60">Cliente usa em {sessionsPath}</span>
                <span className="font-mono text-white text-lg">{sessionCode}</span>
                <button type="button" className={pillButton} onClick={() => setSessionCode(generateSessionCode())}>
                  Gerar novo código
                </button>
              </div>
            </div>
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
                disabled={busy || savingSession || globalLock}
              />
            </label>

          {files.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              Selecionados: <span className="font-semibold text-white">{files.length}</span> ficheiro(s)
            </div>
          )}

          <div className="pt-2">
            <button
              className={primaryButton}
              disabled={busy || savingSession || files.length === 0 || !sessionCode || !sessionName.trim() || globalLock}
            >
              {busy ? "A enviar…" : "Guardar sessão privada"}
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

      <section className={cardClass}>
        <div className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Partilha com o cliente</p>
            <h3 className="text-2xl font-semibold text-white">Código da sessão</h3>
            <p className="text-sm text-white/70">
              Depois de terminares o upload envia este código ao cliente. Ele só precisa de visitar {sessionsPath} e introduzir o
              identificador para escolher as fotos favoritas.
            </p>
          </div>
          {lastSessionCode ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/60">Código</div>
                <div className="text-2xl font-mono text-white">{lastSessionCode}</div>
              </div>
              <button type="button" className={pillButton} onClick={() => navigator.clipboard.writeText(lastSessionCode)}>
                Copiar
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-transparent px-4 py-4 text-sm text-white/60">
              Assim que guardares uma sessão privada o código fica disponível aqui.
            </div>
          )}
          <ul className="space-y-2 text-sm text-white/70">
            <li>1. Faz upload das fotos para a pasta privada.</li>
            <li>2. Envia o código ao cliente.</li>
            <li>
              3. O cliente entra em <span className="font-mono text-white">{sessionsPath}</span>, introduz o código e escolhe as fotos.
            </li>
            <li>4. Quando confirmares o pagamento, o download fica disponível automaticamente.</li>
          </ul>
        </div>
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
