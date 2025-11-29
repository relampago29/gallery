"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";

type SessionRow = {
  id: string;
  name: string;
  createdAt: number | null;
  status: string | null;
  selectedCount: number | null;
  paymentStatus: string | null;
};

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken();
}

function formatDate(value: number | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-PT");
  } catch {
    return "—";
  }
}

export default function PrivateSessionsAdminPage() {
  const [items, setItems] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type?: "success" | "error" | "warning" | "info";
    message: string;
    actions?: { label: string; onClick: () => void; variant?: "primary" | "ghost" }[];
  } | null>(null);
  const PAGE_SIZE = 8;

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/sessions", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao carregar sessões.");
      }
      const data = await res.json();
      setItems(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (err: any) {
      setError(err?.message || "Não foi possível obter as sessões.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  const filtered = filter.trim()
    ? items.filter((s) =>
        [s.name, s.id, s.paymentStatus, s.status]
          .filter(Boolean)
          .some((field) => field?.toLowerCase().includes(filter.trim().toLowerCase()))
      )
    : items;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, totalPages - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const pageList = totalPages <= 4 ? [...Array(totalPages).keys()] : [0, 1, "ellipsis", totalPages - 2, totalPages - 1] as (number | "ellipsis")[];

  const goPage = (idx: number) => {
    if (idx < 0 || idx >= totalPages) return;
    setPageIndex(idx);
  };

  async function deleteSession(id: string, confirmed = false) {
    if (!id) return;
    if (!confirmed) {
      setToast({
        type: "warning",
        message: "Tens a certeza que queres apagar esta sessão? Esta ação não pode ser desfeita.",
        actions: [
          { label: "Cancelar", onClick: () => setToast(null) },
          {
            label: "Apagar",
            variant: "primary",
            onClick: () => {
              setToast(null);
              deleteSession(id, true);
            },
          },
        ],
      });
      return;
    }
    try {
      setDeletingId(id);
      const token = await getIdToken();
      const res = await fetch("/api/admin/sessions", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao apagar sessão.");
      }
      setItems((prev) => prev.filter((s) => s.id !== id));
      setToast({ type: "success", message: "Sessão apagada com sucesso." });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Não foi possível apagar esta sessão." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {toast ? <AdminNotification type={toast.type} message={toast.message} actions={toast.actions} onClose={() => setToast(null)} /> : null}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Sessões</p>
        <h1 className="text-3xl font-semibold text-white">Sessões privadas</h1>
        <p className="text-sm text-white/70">Lista de sessões privadas com código, fotos selecionadas e estado de pagamento.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={loadSessions}
            disabled={loading}
            className="rounded-full border border-white/20 px-4 py-1 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "A carregar…" : "Recarregar"}
          </button>
          <input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPageIndex(0);
            }}
            placeholder="Filtrar por nome, código, estado…"
            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white/50 focus:outline-none sm:w-80"
          />
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">A carregar…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">Sem sessões privadas ainda.</div>
      ) : (
        <div className="space-y-4">
          {pageItems.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              <div className="grid gap-3 sm:grid-cols-6 sm:items-center">
                <div className="sm:col-span-2 space-y-1">
                  <div className="text-base font-semibold text-white">{item.name || "Sessão sem nome"}</div>
                  <div className="text-xs uppercase tracking-[0.35em] text-white/50">{item.id}</div>
                </div>
                <div className="space-y-1 text-sm text-white/70">
                  <div className="font-semibold text-white">{item.selectedCount ?? "—"} selecionadas</div>
                  <div className="text-xs text-white/60">Pagamentos: {item.paymentStatus || "pendente"}</div>
                </div>
                <div className="space-y-1 text-sm text-white/70">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Criada</div>
                  <div className="font-medium text-white">{formatDate(item.createdAt)}</div>
                </div>
                <div className="space-y-1 text-sm text-white/70">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Estado</div>
                  <div className="font-medium text-white">{item.status || "open"}</div>
                </div>
                <div className="flex sm:justify-end">
                  <button
                    type="button"
                    onClick={() => deleteSession(item.id)}
                    disabled={deletingId === item.id}
                    className="w-full sm:w-auto rounded-full border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    {deletingId === item.id ? "A apagar…" : "Apagar sessão"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/60">Página {currentPage + 1} de {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="rounded-full border border-white/25 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                Anterior
              </button>
              <div className="flex items-center gap-2">
                {pageList.map((entry, idx) =>
                  entry === "ellipsis" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-sm text-white/70">
                      …
                    </span>
                  ) : (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => goPage(entry)}
                      disabled={currentPage === entry}
                      className={`min-w-10 rounded-full px-3 py-1.5 text-sm transition ${
                        currentPage === entry
                          ? "bg-white text-gray-900"
                          : "border border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                      }`}
                    >
                      {entry + 1}
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={() => goPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
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
