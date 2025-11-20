"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { listActiveCategories } from "@/lib/categories";
import { listPublicPhotos, pickThumb, type PublicPhoto, deletePublicPhoto } from "@/lib/publicPhotos";

type SessionPhoto = {
  id: string;
  title?: string | null;
  url: string;
  downloadUrl: string;
  createdAt?: number;
};

export default function PublicListPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || "pt";
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<PublicPhoto[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState(false);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"public" | "private">("public");

  const [sessionInput, setSessionInput] = useState("");
  const [privatePhotos, setPrivatePhotos] = useState<SessionPhoto[]>([]);
  const [privateSession, setPrivateSession] = useState<string | null>(null);
  const [privateSessionName, setPrivateSessionName] = useState<string | null>(null);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [privateError, setPrivateError] = useState<string | null>(null);
  const [privateExpiresAt, setPrivateExpiresAt] = useState<number | null>(null);
  const [privateShareUrl, setPrivateShareUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await listActiveCategories();
        setCats(c.map((x) => ({ id: x.id, name: x.name })));
      } catch (err) {
        console.error("categories load failed:", err);
        setCats([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (mode === "public") {
      load(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, mode]);

  async function load(reset = false) {
    if (reset) {
      setLoading(true);
      setError(null);
      const { items, nextCursor } = await listPublicPhotos({
        limitN: 24,
        categoryId,
        cursor: null,
        forceApi: true,
      }).catch((e) => {
        setError(e?.message || "Erro a carregar");
        return { items: [], nextCursor: null };
      });
      setItems(items);
      setCursor(nextCursor ?? null);
      setEnd(!nextCursor);
      setLoading(false);
    } else {
      if (loading || end) return;
      setLoading(true);
      const { items: more, nextCursor } = await listPublicPhotos({
        limitN: 24,
        categoryId,
        cursor,
        forceApi: true,
      }).catch((e) => {
        setError(e?.message || "Erro a carregar");
        return { items: [], nextCursor: null };
      });
      setItems((prev) => [...prev, ...more]);
      setCursor(nextCursor ?? null);
      setEnd(!nextCursor);
      setLoading(false);
    }
  }

  const shareLocalePrefix = `/${locale}/sessions/`;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => (p.title || "").toLowerCase().includes(s));
  }, [items, q]);

  async function handleDelete(id: string) {
    if (!confirm("Apagar esta foto?")) return;
    try {
      await deletePublicPhoto(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      console.error("delete failed", e);
      alert(e?.message || "Falha ao apagar");
    }
  }

  async function loadPrivateSession(e?: React.FormEvent) {
    e?.preventDefault();
    const slug = sessionInput.trim();
    if (!slug) {
      setPrivateError("Indica o identificador da sessão (ex.: joana-rui).");
      return;
    }
    setPrivateLoading(true);
    setPrivateError(null);
    try {
      const res = await fetch(`/api/session-photos/list?sessionId=${encodeURIComponent(slug)}&hours=48`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Falha (${res.status})`);
      }
      const data = await res.json();
      setPrivatePhotos(Array.isArray(data.files) ? data.files : []);
      setPrivateSession(data.sessionId || slug);
      setPrivateSessionName(data.sessionName || slug);
      setPrivateExpiresAt(typeof data.expiresAt === "number" ? data.expiresAt : null);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setPrivateShareUrl(origin ? `${origin}${shareLocalePrefix}${slug}?hours=48` : null);
    } catch (err: any) {
      setPrivateError(err?.message || "Falhou ao carregar a sessão privada.");
      setPrivatePhotos([]);
      setPrivateSession(slug);
      setPrivateSessionName(null);
      setPrivateExpiresAt(null);
      setPrivateShareUrl(null);
    } finally {
      setPrivateLoading(false);
    }
  }

  const shellBg = "relative min-h-screen overflow-hidden bg-[#030303] text-gray-100";
  const backdrop =
    "pointer-events-none absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)] before:content-['']";
  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";
  const inputBase =
    "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white/50 focus:outline-none";
  const primaryButton =
    "inline-flex items-center justify-center rounded-full bg-white text-gray-900 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";
  const pillButton =
    "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 disabled:opacity-40";

  async function loadPrivateSession(e?: React.FormEvent) {
    e?.preventDefault();
    const slug = sessionInput.trim();
    if (!slug) {
      setPrivateError("Indica o identificador da sessão (ex.: joana-rui).");
      return;
    }
    setPrivateLoading(true);
    setPrivateError(null);
    try {
      const res = await fetch(`/api/session-photos/list?sessionId=${encodeURIComponent(slug)}&hours=48`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Falha (${res.status})`);
      }
      const data = await res.json();
      setPrivatePhotos(Array.isArray(data.files) ? data.files : []);
      setPrivateSession(data.sessionId || slug);
      setPrivateSessionName(data.sessionName || slug);
      setPrivateExpiresAt(typeof data.expiresAt === "number" ? data.expiresAt : null);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setPrivateShareUrl(origin ? `${origin}${shareLocalePrefix}${slug}?hours=48` : null);
    } catch (err: any) {
      setPrivateError(err?.message || "Falhou ao carregar a sessão privada.");
      setPrivatePhotos([]);
      setPrivateSession(slug);
      setPrivateSessionName(null);
      setPrivateExpiresAt(null);
      setPrivateShareUrl(null);
    } finally {
      setPrivateLoading(false);
    }
  }

  return (
    <main className={shellBg}>
      <div className={backdrop}>
        <div className="absolute left-0 top-24 h-72 w-72 rounded-full bg-[#7c3aed1f] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#f472b61f] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-10 py-12 px-4 sm:px-6 lg:px-8">
        <header className="space-y-6 text-center sm:text-left">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Admin</p>
              <h1 className="text-4xl font-semibold text-white tracking-tight">Portfólio · Lista</h1>
              <p className="text-sm text-white/70">
                {mode === "public"
                  ? "Filtra por categoria, pesquisa por título e gere rapidamente as fotos públicas."
                  : "Consulta sessões privadas e descarrega as fotos partilhadas com clientes."}
              </p>
            </div>
            {mode === "public" && (
              <div className="w-full sm:max-w-xs">
                <input
                  className={inputBase}
                  placeholder="Pesquisar título…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            )}
          </div>

  <div className="flex rounded-full border border-white/20 bg-white/5 text-sm text-white/70">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-1.5 transition ${
                mode === "public" ? "bg-white text-gray-900" : "hover:bg-white/10"
              }`}
              onClick={() => setMode("public")}
            >
              Público
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-1.5 transition ${
                mode === "private" ? "bg-white text-gray-900" : "hover:bg-white/10"
              }`}
              onClick={() => setMode("private")}
            >
              Privado
            </button>
          </div>
        </header>

        {mode === "public" && (
          <div className="flex flex-wrap gap-3">
            <button
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                !categoryId
                  ? "bg-white text-gray-900"
                  : "border border-white/20 bg-transparent text-white/70 hover:border-white/40"
              }`}
              onClick={() => setCategoryId(undefined)}
            >
              Todas
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  categoryId === c.id
                    ? "bg-white text-gray-900"
                    : "border border-white/20 bg-transparent text-white/70 hover:border-white/40"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {mode === "public" ? (

        <section className={cardClass}>
          <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-semibold text-white">Resultados</div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="text-sm text-white/60 text-center sm:text-left">{filtered.length} itens</div>
              <button
                type="button"
                className="rounded-full border border-red-400/60 px-4 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/10 disabled:opacity-40"
                onClick={async () => {
                  if (purging) return;
                  if (!confirm("Isto vai apagar TODAS as fotos públicas. Continuar?")) return;
                  setPurging(true);
                  try {
                    const res = await fetch("/api/public-photos/delete-all", { method: "POST" });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data?.error || `Falha (${res.status})`);
                    }
                    setItems([]);
                    setCursor(null);
                    setEnd(true);
                    setMsg("Todas as fotos públicas foram removidas.");
                  } catch (err: any) {
                    alert(err?.message || "Não foi possível apagar todas as fotos.");
                  } finally {
                    setPurging(false);
                  }
                }}
                disabled={purging || items.length === 0}
              >
                {purging ? "A apagar…" : "Apagar tudo"}
              </button>
            </div>
          </div>

          {msg && (
            <div className="border-b border-white/10 px-6 py-3 text-sm text-white/80">{msg}</div>
          )}

          {error && (
            <div className="px-6 py-4">
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error.includes("index") || error.includes("FAILED_PRECONDITION")
                  ? "A consulta precisa de um índice Firestore. Faz deploy dos índices."
                  : error}
              </div>
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="px-6 py-10 text-center text-white/60">A carregar…</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-white/60">Sem resultados.</div>
          ) : (
            <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const t = pickThumb(p);
                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                  >
                    <div className="aspect-[4/3] bg-white/10">
                      {t.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.src} alt={p.alt || p.title || "Foto"} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-white/60">
                          {p.status === "processing" ? "A gerar variantes…" : "Sem preview"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 text-sm text-white/90">
                        <div className="truncate text-base font-medium">{p.title || "(sem título)"}</div>
                        <div className="text-xs uppercase tracking-wide text-white/50">{p.status || "—"}</div>
                      </div>
                      <button className="rounded-full border border-red-400/70 px-4 py-1 text-xs text-red-100 hover:bg-red-500/10" onClick={() => handleDelete(p.id)}>
                        Apagar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-white/10 px-6 py-4 text-center">
            <button className={pillButton} onClick={() => load(false)} disabled={loading || end}>
              {end ? "Não há mais" : loading ? "A carregar…" : "Carregar mais"}
            </button>
          </div>
        </section>
        ) : (
          <section className={cardClass}>
            <form className="space-y-4 border-b border-white/10 px-6 py-5" onSubmit={loadPrivateSession}>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-white/60">Sessão privada</span>
                <input
                  className={inputBase}
                  placeholder="Ex.: joana-rui"
                  value={sessionInput}
                  onChange={(e) => setSessionInput(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className={primaryButton}
                disabled={privateLoading || !sessionInput.trim()}
              >
                {privateLoading ? "A carregar…" : "Ver sessão"}
              </button>
            </form>

            {privateError && (
              <div className="px-6 py-4">
                <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {privateError}
                </div>
              </div>
            )}

            {privateSession && !privateLoading && privatePhotos.length === 0 && !privateError && (
              <div className="px-6 py-5 text-center text-sm text-white/60">
                Sem fotos nesta sessão. Verifica o identificador e tenta novamente.
              </div>
            )}

            {privatePhotos.length > 0 && (
              <div className="space-y-4 px-6 py-6">
                <div className="flex flex-col gap-2 text-white">
                  <div className="text-sm uppercase tracking-[0.35em] text-white/50">
                    {privateSessionName || privateSession}
                  </div>
                  {privateShareUrl && (
                    <div className="text-xs text-white/70 break-all">
                      <span className="font-semibold">Link público:</span>{" "}
                      <a href={privateShareUrl} target="_blank" rel="noreferrer" className="underline">
                        {privateShareUrl}
                      </a>
                    </div>
                  )}
                  {privateExpiresAt && (
                    <div className="text-xs text-white/60">
                      Links válidos até {new Date(privateExpiresAt).toLocaleString("pt-PT")}
                    </div>
                  )}
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {privatePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                    >
                      <div className="aspect-[4/3] bg-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.title || "Sessão privada"} className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-2 px-4 py-4 text-sm text-white/80">
                        <div className="font-semibold truncate text-white">{photo.title || "(sem título)"}</div>
                        {photo.createdAt && (
                          <div className="text-xs uppercase tracking-wide text-white/50">
                            {new Date(photo.createdAt).toLocaleDateString("pt-PT", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        )}
                        <a
                          href={photo.downloadUrl}
                          className="inline-flex w-full items-center justify-center rounded-full border border-white/30 px-4 py-1.5 text-xs text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Transferir
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
