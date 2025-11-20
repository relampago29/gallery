"use client";

import { useEffect, useMemo, useState } from "react";
import { listActiveCategories } from "@/lib/categories";
import {
  uploadMasterAndCreateProcessingDoc,
  uploadPrivateMaster,
  registerPrivateSessionPhoto,
} from "@/lib/publicPhotos";
import { useParams } from "next/navigation";

function slugifySessionName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function UploadPublicPhotoPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || "";
  const sessionsPath = locale ? `/${locale}/sessions` : "/sessions";

  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [sessionName, setSessionName] = useState("");
  const sessionSlug = useMemo(() => slugifySessionName(sessionName), [sessionName]);
  const [lastSessionCode, setLastSessionCode] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const c = await listActiveCategories();
      setCats(c.map((x) => ({ id: x.id, name: x.name })));
      if (c.length) setCategoryId(c[0].id);
    })();
  }, []);

  useEffect(() => {
    if (visibility === "public") {
      setLastSessionCode(null);
    }
  }, [visibility]);

  function buildSequentialLabel(sequenceNumber: number, base?: string | null) {
    const safeBase = base && base.trim().length ? base.trim() : "Foto";
    return `${safeBase} ${sequenceNumber}`;
  }

  async function reserveSequenceNumbers(params: { mode: "public" | "private"; count: number; sessionId?: string }) {
    const payload: any = { mode: params.mode, count: params.count };
    if (params.sessionId) payload.sessionId = params.sessionId;
    const res = await fetch("/api/upload/sequence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Falha (${res.status}) ao reservar numeração.`);
    }
    const data = await res.json();
    const start = Number(data?.start) || 1;
    return start;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (visibility === "public" && (!categoryId || files.length === 0)) return;
    if (visibility === "private") {
      if (files.length === 0) return;
      if (!sessionSlug) {
        setMsg("Escolhe um nome válido para a sessão.");
        return;
      }
    }
    setBusy(true);
    setProgress(0);
    setMsg(null);
    try {
      const start = await reserveSequenceNumbers({
        mode: visibility,
        count: files.length,
        sessionId: visibility === "private" ? sessionSlug : undefined,
      });

      if (visibility === "public") {
        for (const [index, f] of files.entries()) {
          const sequenceNumber = start + index;
          const generatedTitle = buildSequentialLabel(sequenceNumber, title);
          const generatedAlt = buildSequentialLabel(sequenceNumber, alt ?? title);
          await uploadMasterAndCreateProcessingDoc({
            file: f,
            categoryId,
            title: generatedTitle,
            alt: generatedAlt,
            sequenceNumber,
          });
          setProgress((index + 1) / files.length);
        }
        setMsg(
          `${files.length} ficheiro(s) enviados para a pasta pública. As variantes serão geradas automaticamente.`
        );
      } else {
        for (const [index, f] of files.entries()) {
          const sequenceNumber = start + index;
          const generatedTitle = buildSequentialLabel(sequenceNumber);
          const { masterPath, createdAt } = await uploadPrivateMaster({ file: f, sessionId: sessionSlug });
          await registerPrivateSessionPhoto({
            sessionId: sessionSlug,
            masterPath,
            title: generatedTitle,
            alt: generatedTitle,
            createdAt,
            sequenceNumber,
          });
          setProgress((index + 1) / files.length);
        }
        setLastSessionCode(sessionSlug);
        setMsg(
          `${files.length} ficheiro(s) enviados para "${sessionSlug}". Partilha este código com o cliente para selecionar as fotos.`
        );
      }
      setFiles([]);
      setTitle("");
      setAlt("");
    } catch (e: any) {
      setMsg("Erro: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const shellBg = "relative min-h-screen overflow-hidden bg-[#030303] text-gray-100";
  const backdrop =
    "pointer-events-none absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_60%)] before:content-['']";
  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const inputBase =
    "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white/50 focus:outline-none disabled:opacity-50";
  const selectBase = `${inputBase} appearance-none`;
  const primaryButton =
    "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";
  const pillButton =
    "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 disabled:opacity-40";

  return (
    <main className={shellBg}>
      <div className={backdrop}>
        <div className="absolute -left-16 top-24 h-72 w-72 rounded-full bg-[#7c3aed1f] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#f472b61f] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl space-y-10 py-12 px-4 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Admin</p>
          <h1 className="text-4xl font-semibold text-white tracking-tight">Upload & Sessões</h1>
          <p className="text-sm text-white/70">
            Escolhe o destino, envia as fotos e partilha o código da sessão com o cliente para ele aceder em {sessionsPath}.
          </p>
        </header>

        <section className={cardClass}>
          <form className="space-y-6 p-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">Destino</span>
                <select
                  className={selectBase}
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                >
                  <option value="public">Pasta pública</option>
                  <option value="private">Pasta privada</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">Categoria</span>
                <select
                  className={selectBase}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={visibility === "private"}
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              {visibility === "private" && (
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs uppercase tracking-[0.25em] text-white/60">Nome da sessão</span>
                  <input
                    className={inputBase}
                    placeholder="Ex.: Sessão Joana & Rui"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    required={visibility === "private"}
                  />
                  <span className="text-xs text-white/50">
                    {sessionSlug
                      ? `Código que o cliente vai introduzir em ${sessionsPath}: ${sessionSlug}`
                      : "Usa apenas letras e números"}
                  </span>
                </label>
              )}

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">Ficheiros</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-gray-900 hover:border-white/40"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  required
                />
              </label>
            </div>

            {visibility === "public" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className={inputBase}
                  placeholder="Título (opcional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  className={inputBase}
                  placeholder="Alt (opcional)"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                />
              </div>
            )}

            {files.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                Selecionados: <span className="font-semibold text-white">{files.length}</span> ficheiro(s)
              </div>
            )}

            <div className="pt-2">
              <button
                className={primaryButton}
                disabled={
                  busy ||
                  files.length === 0 ||
                  (visibility === "public" && !categoryId) ||
                  (visibility === "private" && !sessionSlug)
                }
              >
                {busy ? "A enviar…" : visibility === "public" ? "Guardar no portfólio" : "Guardar sessão privada"}
              </button>
            </div>
          </form>
          {msg && (
            <div className="border-t border-white/10 px-6 py-4 text-sm text-white/80">
              {msg}
            </div>
          )}
          {progress !== null && (
            <div className="border-t border-white/10 px-6 py-4">
              <div className="mb-2 text-xs uppercase tracking-[0.3em] text-white/60">
                Upload {Math.round(progress * 100)}%
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {visibility === "private" && (
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
                  <button
                    type="button"
                    className={pillButton}
                    onClick={() => navigator.clipboard.writeText(lastSessionCode)}
                  >
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
        )}
      </div>
    </main>
  );
}
