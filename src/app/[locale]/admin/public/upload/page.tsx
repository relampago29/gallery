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

  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [privateLinks, setPrivateLinks] = useState<{ name: string; url: string }[]>([]);
  const [expiryHours, setExpiryHours] = useState<number>(48);
  const [privatePaths, setPrivatePaths] = useState<{ name: string; path: string }[]>([]);
  const [sessionName, setSessionName] = useState("");
  const sessionSlug = useMemo(() => slugifySessionName(sessionName), [sessionName]);
  const [sessionShare, setSessionShare] = useState<{ sessionId: string; url: string } | null>(null);

  async function signPrivatePaths(paths: { name: string; path: string }[]) {
    const out: { name: string; url: string }[] = [];
    for (const p of paths) {
      try {
        const res = await fetch(`/api/storage/sign?path=${encodeURIComponent(p.path)}&hours=${expiryHours}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.url) out.push({ name: p.name, url: data.url });
        }
      } catch {
        // ignore errors, re-run later
      }
    }
    return out;
  }

  function buildSessionShareUrl(slug: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const localePrefix = locale ? `/${locale}` : "";
    return `${origin}${localePrefix}/sessions/${slug}?hours=${expiryHours}`;
  }

  useEffect(() => {
    (async () => {
      const c = await listActiveCategories();
      setCats(c.map((x) => ({ id: x.id, name: x.name })));
      if (c.length) setCategoryId(c[0].id);
    })();
  }, []);

  useEffect(() => {
    if (visibility === "public") setSessionShare(null);
  }, [visibility]);

  function buildSequentialLabel(index: number, base?: string | null) {
    const safeBase = base && base.trim().length ? base.trim() : "Foto";
    return `${safeBase} ${index + 1}`;
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
    setMsg(null);
    try {
      if (visibility === "public") {
        for (const [index, f] of files.entries()) {
          const generatedTitle = buildSequentialLabel(index, title);
          const generatedAlt = buildSequentialLabel(index, alt ?? title);
          await uploadMasterAndCreateProcessingDoc({
            file: f,
            categoryId,
            title: generatedTitle,
            alt: generatedAlt,
          });
        }
        setMsg(
          `${files.length} ficheiro(s) enviados para a pasta pública. As variantes serão geradas automaticamente.`
        );
        setPrivateLinks([]);
      } else {
        const paths: { name: string; path: string }[] = [];
        for (const [index, f] of files.entries()) {
          const generatedTitle = buildSequentialLabel(index);
          const { masterPath, createdAt } = await uploadPrivateMaster({ file: f, sessionId: sessionSlug });
          await registerPrivateSessionPhoto({
            sessionId: sessionSlug,
            masterPath,
            title: generatedTitle,
            alt: generatedTitle,
            createdAt,
          });
          paths.push({ name: generatedTitle, path: masterPath });
        }
        setPrivatePaths(paths);
        const links = await signPrivatePaths(paths);
        setPrivateLinks(links);
        const shareUrl = buildSessionShareUrl(sessionSlug);
        setSessionShare({ sessionId: sessionSlug, url: shareUrl });
        setMsg(
          `${files.length} ficheiro(s) enviados para "${sessionSlug}". Links ${
            links.length ? "gerados" : "serão gerados em instantes"
          } por ${expiryHours}h.`
        );
      }
      setFiles([]);
      setTitle("");
      setAlt("");
    } catch (e: any) {
      setMsg("Erro: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
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
            Escolhe o destino, envia as fotos e partilha com o cliente através de um link privado.
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
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.25em] text-white/60">Validade do link</span>
                  <select
                    className={selectBase}
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(Number(e.target.value))}
                  >
                    <option value={24}>24 horas</option>
                    <option value={48}>48 horas</option>
                    <option value={168}>7 dias</option>
                  </select>
                </label>
              )}

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
                    {sessionSlug ? `Link base: /sessions/${sessionSlug}` : "Usa apenas letras e números"}
                  </span>
                </label>
              )}

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">Ficheiros</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-8 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-gray-900 hover:border-white/40"
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
        </section>

        {visibility === "private" && (
          <section className={cardClass}>
            <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-white/70">Links de download (válidos por {expiryHours}h)</span>
              {privatePaths.length > 0 && (
                <button
                  type="button"
                  className={pillButton}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const links = await signPrivatePaths(privatePaths);
                      setPrivateLinks(links);
                      if (!links.length) {
                        setMsg("Ainda a preparar os ficheiros. Tenta novamente em alguns segundos.");
                      }
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  Gerar links
                </button>
              )}
            </div>
            {privateLinks.length === 0 ? (
              <div className="px-6 py-5 text-sm text-white/60">
                Sem links ainda. Assim que os ficheiros ficarem visíveis, clica em “Gerar links”.
              </div>
            ) : (
              <ul className="space-y-3 px-6 py-5">
                {privateLinks.map((l, idx) => (
                  <li
                    key={idx}
                    className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="truncate">
                      <div className="font-medium text-white truncate">{l.name}</div>
                      <a
                        className="text-xs text-white/70 break-all hover:text-white"
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {l.url}
                      </a>
                    </div>
                    <button type="button" className={pillButton} onClick={() => navigator.clipboard.writeText(l.url)}>
                      Copiar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {sessionShare && (
              <div className="border-t border-white/10 px-6 py-5 space-y-2">
                <div className="text-sm font-semibold text-white">Link geral da sessão ({sessionShare.sessionId})</div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    className="text-sm text-white/80 break-all hover:text-white"
                    href={sessionShare.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {sessionShare.url}
                  </a>
                  <button type="button" className={pillButton} onClick={() => navigator.clipboard.writeText(sessionShare.url)}>
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-white/60">
                  Junta todas as fotos enviadas nesta sessão e expira em {expiryHours}h.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
