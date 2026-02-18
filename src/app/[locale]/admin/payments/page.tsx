"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";

type PendingOrder = {
  id: string;
  sessionId: string;
  sessionName: string;
  selectedCount: number;
  createdAt: number | null;
};

type PendingEventOrder = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  itemCount: number;
  totalPrice: number;
  eventNames: Record<string, string>;
  createdAt: number | null;
};

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken();
}

export default function PendingPaymentsPage() {
  const [items, setItems] = useState<PendingOrder[]>([]);
  const [eventItems, setEventItems] = useState<PendingEventOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentPhone, setPaymentPhone] = useState<string | null>(null);
  const [mode, setMode] = useState<"pending" | "history">("pending");
  const [history, setHistory] = useState<PendingOrder[]>([]);
  const [filter, setFilter] = useState("");
  const [pendingPage, setPendingPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info" | "confirm";
    message: string;
    actions?: {
      label: string;
      onClick: () => void;
      variant?: "primary" | "ghost";
    }[];
  } | null>(null);
  const [actioning, setActioning] = useState<{
    id: string;
    type: "confirm" | "cancel" | "reject";
  } | null>(null);
  const [modal, setModal] = useState<{
    id: string;
    type: "confirm" | "reject";
    collection: "session" | "event";
    message: string;
  } | null>(null);

  const PAGE_SIZE = 5;

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/session-orders/pending", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Falha ao carregar");
      }
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setError(
        err?.message || "Não foi possível carregar os pagamentos pendentes.",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEventPending() {
    try {
      const token = await getIdToken();
      const res = await fetch("/api/event-orders/pending", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        console.error("[loadEventPending] API error:", payload);
        return;
      }
      const data = await res.json();
      setEventItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("[loadEventPending] fetch error:", err);
    }
  }

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/session-orders?status=paid", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Falha ao carregar histórico.");
      }
      const data = await res.json();
      setHistory(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar o histórico.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPhone() {
    try {
      const res = await fetch("/api/settings/payment-phone", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (typeof data?.phone === "string" && data.phone.trim().length) {
        setPaymentPhone(data.phone.trim());
      }
    } catch {
      // ignore
    }
  }

  const runAction = useCallback(
    async (
      orderId: string,
      type: "confirm" | "cancel" | "reject",
      collection: "session" | "event" = "session",
    ) => {
      const endpoint =
        type === "confirm"
          ? "confirm"
          : type === "cancel"
            ? "cancel"
            : "reject";
      const apiBase =
        collection === "event" ? "event-orders" : "session-orders";
      try {
        setActioning({ id: orderId, type });
        const token = await getIdToken();
        const res = await fetch(`/api/${apiBase}/${orderId}/${endpoint}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || "Falha ao processar.");
        }
        if (collection === "event") {
          setEventItems((prev) => prev.filter((item) => item.id !== orderId));
        } else {
          setItems((prev) => prev.filter((item) => item.id !== orderId));
        }
        setToast({
          type: "success",
          message:
            type === "confirm"
              ? "Pagamento confirmado."
              : type === "cancel"
                ? "Pagamento cancelado."
                : "Pagamento rejeitado.",
        });
      } catch (err: any) {
        setToast({
          type: "error",
          message: err?.message || "Não foi possível completar a ação.",
        });
      } finally {
        setActioning(null);
      }
    },
    [],
  );

  const confirmActionPrompt = useCallback(
    (
      orderId: string,
      type: "confirm" | "reject",
      collection: "session" | "event" = "session",
    ) => {
      const messages = {
        confirm: "Tem a certeza que quer confirmar o pagamento?",
        reject: "Tem a certeza que quer rejeitar o pagamento?",
      };
      setModal({ id: orderId, type, collection, message: messages[type] });
    },
    [runAction],
  );

  const normalizedFilter = filter.trim().toLowerCase();

  const filteredPending = useMemo(() => {
    if (!normalizedFilter) return items;
    return items.filter((item) => {
      const text = `${item.sessionName || ""} ${
        item.sessionId || ""
      }`.toLowerCase();
      return text.includes(normalizedFilter);
    });
  }, [items, normalizedFilter]);

  const filteredEventPending = useMemo(() => {
    if (!normalizedFilter) return eventItems;
    return eventItems.filter((item) => {
      const text = `${Object.values(item.eventNames || {}).join(" ")} ${
        item.userName || ""
      } ${item.userEmail || ""}`.toLowerCase();
      return text.includes(normalizedFilter);
    });
  }, [eventItems, normalizedFilter]);

  const filteredHistory = useMemo(() => {
    if (!normalizedFilter) return history;
    return history.filter((item) => {
      const text = `${item.sessionName || ""} ${
        item.sessionId || ""
      }`.toLowerCase();
      return text.includes(normalizedFilter);
    });
  }, [history, normalizedFilter]);

  useEffect(() => {
    setPendingPage(0);
    setHistoryPage(0);
  }, [normalizedFilter]);

  const pendingTotalPages = Math.max(
    1,
    Math.ceil(filteredPending.length / PAGE_SIZE),
  );
  const pendingPageSafe = Math.min(pendingPage, pendingTotalPages - 1);
  const pendingHasPrev = pendingPageSafe > 0;
  const pendingHasNext = pendingPageSafe < pendingTotalPages - 1;
  const pendingPageList = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const total = pendingTotalPages;
    const current = pendingPageSafe;
    for (let i = 0; i < total; i++) {
      if (i === 0 || i === total - 1 || Math.abs(i - current) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis");
      }
    }
    return pages;
  }, [pendingPageSafe, pendingTotalPages]);
  const visiblePending = useMemo(
    () =>
      filteredPending.slice(
        pendingPageSafe * PAGE_SIZE,
        pendingPageSafe * PAGE_SIZE + PAGE_SIZE,
      ),
    [filteredPending, pendingPageSafe],
  );

  const historyTotalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / PAGE_SIZE),
  );
  const historyPageSafe = Math.min(historyPage, historyTotalPages - 1);
  const historyHasPrev = historyPageSafe > 0;
  const historyHasNext = historyPageSafe < historyTotalPages - 1;
  const historyPageList = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const total = historyTotalPages;
    const current = historyPageSafe;
    for (let i = 0; i < total; i++) {
      if (i === 0 || i === total - 1 || Math.abs(i - current) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis");
      }
    }
    return pages;
  }, [historyPageSafe, historyTotalPages]);
  const visibleHistory = useMemo(
    () =>
      filteredHistory.slice(
        historyPageSafe * PAGE_SIZE,
        historyPageSafe * PAGE_SIZE + PAGE_SIZE,
      ),
    [filteredHistory, historyPageSafe],
  );

  useEffect(() => {
    loadPending();
    loadEventPending();
    loadPhone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      {toast ? (
        <AdminNotification
          type={toast.type}
          message={toast.message}
          actions={toast.actions}
          onClose={() => setToast(null)}
        />
      ) : null}
      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0b0b0b] p-6 text-white shadow-2xl">
            <div className="text-lg font-semibold">{modal.message}</div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-full border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10"
                onClick={() => setModal(null)}
                disabled={!!actioning}
              >
                Voltar
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90 disabled:opacity-50"
                onClick={() => {
                  if (!modal) return;
                  runAction(modal.id, modal.type, modal.collection);
                  setModal(null);
                }}
                disabled={!!actioning}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Pagamentos
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Pagamentos pendentes
        </h1>
        <p className="text-sm text-white/70">
          Confirma os pedidos quando recebes o pagamento via MBWay
          {paymentPhone ? ` para ${paymentPhone}` : ""}.
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("pending");
                  setPendingPage(0);
                }}
                className={`px-3 py-1 rounded-full ${
                  mode === "pending"
                    ? "bg-white text-gray-900"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                Em andamento
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("history");
                  setHistoryPage(0);
                  if (!history.length) loadHistory();
                }}
                className={`px-3 py-1 rounded-full ${
                  mode === "history"
                    ? "bg-white text-gray-900"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                Histórico
              </button>
            </div>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por nome, sessão ou utilizador"
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white/50 focus:outline-none sm:w-72"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              loadPending();
              loadEventPending();
            }}
            className="rounded-full border border-white/20 px-4 py-1 text-sm text-white transition hover:bg-white/10"
          >
            Recarregar
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {mode === "pending" ? (
        <>
          {/* Session orders pending */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
              Sessões privadas
            </h2>
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
                A carregar…
              </div>
            ) : filteredPending.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                Sem sessões pendentes.
              </div>
            ) : (
              <div className="space-y-4">
                {visiblePending.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                  >
                    <div className="grid gap-3 sm:grid-cols-4 sm:items-center">
                      <div className="sm:col-span-2 space-y-1">
                        <div className="text-lg font-semibold text-white">
                          {item.sessionName || "Sessão sem nome"}
                        </div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                          {item.sessionId}
                        </p>
                      </div>
                      <div className="space-y-1 text-sm text-white/70">
                        <div className="font-semibold text-white">
                          {item.selectedCount} foto(s)
                        </div>
                        <div>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString("pt-PT")
                            : "sem data"}
                        </div>
                      </div>
                      <div className="flex justify-start sm:justify-end">
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() =>
                              confirmActionPrompt(item.id, "confirm", "session")
                            }
                            disabled={!!actioning}
                            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
                          >
                            {actioning?.id === item.id &&
                            actioning.type === "confirm"
                              ? "A confirmar…"
                              : "Pagamento confirmado"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              confirmActionPrompt(item.id, "reject", "session")
                            }
                            disabled={!!actioning}
                            className="rounded-full border border-rose-300/60 px-4 py-2 text-xs text-rose-100 transition hover:bg-rose-500/10 disabled:opacity-40"
                          >
                            {actioning?.id === item.id &&
                            actioning.type === "reject"
                              ? "A rejeitar…"
                              : "Rejeitar pagamento"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event orders pending */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
              Eventos
            </h2>
            {filteredEventPending.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
                Sem pedidos de eventos pendentes.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEventPending.map((item) => {
                  const eventNameStr =
                    Object.values(item.eventNames || {}).join(", ") || "Evento";
                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-amber-400/20 bg-amber-500/5 p-5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                    >
                      <div className="grid gap-3 sm:grid-cols-4 sm:items-center">
                        <div className="sm:col-span-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                              Evento
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-white">
                            {eventNameStr}
                          </div>
                          {(item.userName || item.userEmail) && (
                            <div className="text-sm text-white/60">
                              {item.userName && (
                                <span className="font-medium text-white/80">
                                  {item.userName}
                                </span>
                              )}
                              {item.userName && item.userEmail && (
                                <span className="mx-1">·</span>
                              )}
                              {item.userEmail && <span>{item.userEmail}</span>}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-white/70">
                          <div className="font-semibold text-white">
                            {item.itemCount} foto(s) ·{" "}
                            {item.totalPrice.toFixed(2)}€
                          </div>
                          <div>
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString("pt-PT")
                              : "sem data"}
                          </div>
                        </div>
                        <div className="flex justify-start sm:justify-end">
                          <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() =>
                                confirmActionPrompt(item.id, "confirm", "event")
                              }
                              disabled={!!actioning}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
                            >
                              {actioning?.id === item.id &&
                              actioning.type === "confirm"
                                ? "A confirmar…"
                                : "Pagamento confirmado"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                confirmActionPrompt(item.id, "reject", "event")
                              }
                              disabled={!!actioning}
                              className="rounded-full border border-rose-300/60 px-4 py-2 text-xs text-rose-100 transition hover:bg-rose-500/10 disabled:opacity-40"
                            >
                              {actioning?.id === item.id &&
                              actioning.type === "reject"
                                ? "A rejeitar…"
                                : "Rejeitar pagamento"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          A carregar…
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          Não há histórico para mostrar.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleHistory.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm"
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                  {item.sessionId}
                </p>
                <div className="text-lg font-semibold text-white">
                  {item.sessionName || "Sessão sem nome"}
                </div>
                <p className="text-sm text-white/60">
                  {item.selectedCount} foto(s) ·{" "}
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString("pt-PT")
                    : "sem data"}
                </p>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/60">
              Página {historyPageSafe + 1} de {historyTotalPages} · Máximo de{" "}
              {PAGE_SIZE} registos por página.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  historyHasPrev &&
                  setHistoryPage((prev) => Math.max(prev - 1, 0))
                }
                disabled={!historyHasPrev || loading}
                className="rounded-full border border-white/25 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                Anterior
              </button>
              <div className="flex items-center gap-2">
                {historyPageList.map((entry, idx) =>
                  entry === "ellipsis" ? (
                    <span
                      key={`ellipsis-h-${idx}`}
                      className="px-2 text-sm text-white/70"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={`history-${entry}`}
                      type="button"
                      onClick={() => setHistoryPage(entry)}
                      disabled={loading || historyPage === entry}
                      aria-current={historyPage === entry ? "page" : undefined}
                      className={`min-w-10 rounded-full px-3 py-1.5 text-sm transition ${
                        historyPage === entry
                          ? "bg-white text-gray-900"
                          : "border border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                      }`}
                    >
                      {entry + 1}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  historyHasNext &&
                  setHistoryPage((prev) =>
                    Math.min(prev + 1, historyTotalPages - 1),
                  )
                }
                disabled={!historyHasNext || loading}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
