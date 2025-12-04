"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import NavBar from "@/components/shared/navbar/navbar";
import { useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

type SessionPhoto = {
  id: string;
  title?: string | null;
  url: string;
  createdAt?: number;
};

type SessionPayload = {
  sessionId: string;
  sessionName: string;
  files: SessionPhoto[];
};

type ExistingOrder = {
  id: string;
  status: string;
  token?: string | null;
  selectedCount?: number;
  sessionName?: string;
};

export default function SessionsEntryPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <header className="text-center space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Sessões privadas</p>
            <h1 className="text-4xl font-semibold tracking-tight">Vê a tua sessão</h1>
            <p className="text-sm text-white/70">
              Introduz o código que recebeste para desbloquear a galeria privada e escolhe as fotos que queres transferir.
            </p>
          </header>
          <SessionFlow />
        </div>
      </main>
    </div>
  );
}

function SessionFlow() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [existingOrder, setExistingOrder] = useState<ExistingOrder | null>(null);
  const [checkingOrder, setCheckingOrder] = useState(false);
  const [existingOrderError, setExistingOrderError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setSession(null);
    setSelected(new Set());
    setExistingOrder(null);
    setExistingOrderError(null);
    try {
      const params = new URLSearchParams({ sessionId: code.trim() });
      const res = await fetch(`/api/session-photos/list?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Não encontrámos essa sessão");
      }
      const data = (await res.json()) as SessionPayload;
      if (!data?.files?.length) {
        throw new Error("Ainda não existem fotos nessa sessão.");
      }
      setSession(data);
      void fetchExistingOrder(data.sessionId);
    } catch (err: any) {
      setError(err?.message || "Falha ao procurar essa sessão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prefill = searchParams.get("sessionId");
    if (prefill) {
      setCode(prefill);
      // dispara busca automática
      (async () => {
        setLoading(true);
        setError(null);
        setSession(null);
        setSelected(new Set());
        setExistingOrder(null);
        setExistingOrderError(null);
        try {
          const params = new URLSearchParams({ sessionId: prefill.trim() });
          const res = await fetch(`/api/session-photos/list?${params.toString()}`, { cache: "no-store" });
          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload?.error || "Não encontrámos essa sessão");
          }
          const data = (await res.json()) as SessionPayload;
          if (!data?.files?.length) {
            throw new Error("Ainda não existem fotos nessa sessão.");
          }
          setSession(data);
          void fetchExistingOrder(data.sessionId);
        } catch (err: any) {
          setError(err?.message || "Falha ao procurar essa sessão.");
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const togglePhoto = (photoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!session) return;
    setSelected(new Set(session.files.map((file) => file.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const selectionCount = selected.size;
  const allSelected = session ? selectionCount === session.files.length : false;

  const instructions = useMemo(() => {
  if (!session) return null;

  // se estiver pago, não renderiza NADA deste bloco
  if (existingOrder?.status === "paid") return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Sessão</p>
          <h2 className="text-2xl font-semibold text-white">{session.sessionName}</h2>
          <p className="text-sm text-white/70">Escolhe as fotos preferidas para continuar.</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="text-white">
            Selecionadas: <span className="font-semibold">{selectionCount}</span>
          </div>
          <div className="flex gap-2 text-xs uppercase tracking-wide text-white/60">
            <button
              type="button"
              className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/10"
              onClick={selectAll}
              disabled={!session.files.length}
            >
              Selecionar todas
            </button>

            <button
              type="button"
              className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/10"
              onClick={clearSelection}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}, [session, selectionCount, existingOrder]); // <-- importante


  async function fetchExistingOrder(sessionId: string) {
    setCheckingOrder(true);
    setExistingOrderError(null);
    try {
      const res = await fetch(`/api/session-orders?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Não foi possível verificar pedidos anteriores.");
      }
      const data = await res.json();
      const ord = data?.order || null;
      if (ord && (ord.status === "rejected" || ord.status === "cancelled")) {
        setExistingOrder(null);
      } else {
        setExistingOrder(ord);
      }
    } catch (err: any) {
      setExistingOrder(null);
      setExistingOrderError(err?.message || "Falhou ao procurar pedidos anteriores.");
    } finally {
      setCheckingOrder(false);
    }
  }

  const proceed = async () => {
    if (!session || !selectionCount) return;
    setCreatingOrder(true);
    try {
      const res = await fetch("/api/session-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, photoIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Não foi possível avançar.");
      }
      const payload = await res.json();
      const orderId = payload?.orderId;
      const token = payload?.token;
      if (!orderId || !token) {
        throw new Error("Falha a criar o pedido.");
      }
      router.push(`/${locale}/sessions/orders/${orderId}?token=${token}`);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos avançar.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const resumeOrder = () => {
    if (!existingOrder || !existingOrder.token) return;
    const target =
      existingOrder.status === "pending"
        ? `/${locale}/sessions/orders/${existingOrder.id}?token=${existingOrder.token}`
        : `/${locale}/sessions/orders/${existingOrder.id}/download?token=${existingOrder.token}`;
    router.push(target);
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm"
        >
          <label className="block text-sm font-medium text-white/70">Código da sessão</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Ex.: abc123xy"
              className="flex-1 rounded-2xl border border-white/10 bg-[#050505] px-4 py-3 text-sm text-white outline-none focus:border-white/40"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
            >
              {loading ? "A procurar…" : "Ver sessão"}
            </button>
            {code.trim() ? (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(code.trim())}
                className="rounded-2xl border border-white/30 px-4 py-3 text-sm text-white transition hover:bg-white/10"
              >
                Copiar código
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </form>
      </div>
    );
  }

  const existingOrderCard = existingOrder ? (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Pedido em curso</p>
        <h2 className="text-2xl font-semibold text-white">Já existe um pedido para esta sessão</h2>
        <p className="text-sm text-white/70">
          {existingOrder.status === "pending"
            ? "Terminaste a seleção. Volta à página de pagamento para confirmar o MBWay."
            : existingOrder.status === "paid"
              ? "O pagamento está confirmado. Prepara o download automático."
              : "Pedido finalizado — podes descarregar as fotos novamente."}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
        <button
          type="button"
          onClick={resumeOrder}
          disabled={!existingOrder.token}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
        >
          {existingOrder.status === "pending" ? "Ir para o pagamento" : "Transferir fotos"}
        </button>
        <button
          type="button"
          onClick={() => {
            setExistingOrder(null);
            setSelected(new Set());
          }}
          className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
        >
          Quero escolher de novo
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {instructions}
      {checkingOrder ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          A verificar pedidos anteriores…
        </div>
      ) : null}
      {existingOrderError ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {existingOrderError}
        </div>
      ) : null}
      {error ? <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}
      {existingOrderCard ? (
        existingOrderCard
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {session.files.map((photo) => {
              const isSelected = selected.has(photo.id);
              const imageSrc =
                photo && typeof photo.url === "string" && photo.url.trim().length
                  ? photo.url
                  : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => togglePhoto(photo.id)}
                  className={`relative overflow-hidden rounded-3xl border ${
                    isSelected ? "border-white/80" : "border-white/10"
                  } bg-white/5 text-left shadow-[0_25px_120px_rgba(0,0,0,0.45)] transition hover:border-white/40`}
                >
                    <span className="absolute right-3 top-3 z-10 rounded-full border border-white/60 bg-black/40 px-2 py-0.5 text-xs text-white">
                    {isSelected ? "Selecionada" : "Selecionar"}
                    </span>
                    <div className="relative aspect-[4/5]">
                    <Image
                      src={imageSrc}
                      alt={photo.title || "Foto"}
                      fill
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      className="object-cover"
                      loading="lazy"
                      unoptimized
                      style={{ backgroundColor: "#0a0a0a" }}
                    />
                    <div
                      className={`pointer-events-none absolute inset-0 bg-black/60 transition ${isSelected ? "opacity-40" : "opacity-0"}`}
                    />
                    </div>

                  
                  <div className="p-4">
                    <div className="truncate text-base font-medium text-white">{photo.title || "(sem título)"}</div>
                    {photo.createdAt ? (
                      <div className="text-xs uppercase tracking-wide text-white/60">
                        {new Date(photo.createdAt).toLocaleDateString("pt-PT")}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setSession(null);
                setCode("");
                setSelected(new Set());
                setError(null);
                setExistingOrder(null);
                setExistingOrderError(null);
              }}
              className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Procurar outra sessão
            </button>
            <button
              type="button"
              disabled={!selectionCount || creatingOrder}
              onClick={proceed}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
            >
              {creatingOrder ? "A preparar…" : `Avançar (${selectionCount} fotos)`}
            </button>
          </div>
          {!selectionCount ? (
            <p className="text-center text-sm text-white/60">Seleciona pelo menos uma foto para continuar.</p>
          ) : null}
          {allSelected ? (
            <p className="text-center text-sm text-emerald-300/80">Todas as fotos desta sessão estão selecionadas.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
