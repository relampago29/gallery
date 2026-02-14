"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { AdminNotification } from "@/components/admin/Notification";
import {
  Lock,
  Search,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CreditCard,
} from "lucide-react";

type SessionRow = {
  id: string;
  name: string;
  createdAt: number | null;
  status: string | null;
  selectedCount: number | null;
  paymentStatus: string | null;
  photoCount: number;
};

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken();
}

function formatDate(value: number | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function statusLabel(status: string | null) {
  switch (status) {
    case "paid":
      return { text: "Pago", cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" };
    case "pending":
      return { text: "Pendente", cls: "border-amber-400/40 bg-amber-500/10 text-amber-200" };
    default:
      return { text: status || "—", cls: "border-white/15 bg-white/5 text-white/60" };
  }
}

export default function PrivateSessionsAdminPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || "pt";
  const router = useRouter();

  const [items, setItems] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type?: "success" | "error" | "warning" | "info";
    message: string;
    actions?: { label: string; onClick: () => void; variant?: "primary" | "ghost" }[];
  } | null>(null);
  const PAGE_SIZE = 10;
  const [actionModal, setActionModal] = useState<{ id: string; type: "delete"; name?: string } | null>(null);

  const loadSessions = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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

  const goPage = (idx: number) => {
    if (idx < 0 || idx >= totalPages) return;
    setPageIndex(idx);
  };

  async function deleteSession(id: string) {
    if (!id) return;
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

  function copySessionCode(e: React.MouseEvent, code: string) {
    e.stopPropagation();
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedId(code);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setToast({ type: "error", message: "Não foi possível copiar o código." });
    }
  }

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";

  return (
    <div className="space-y-8">
      {toast && (
        <AdminNotification
          type={toast.type}
          message={toast.message}
          actions={toast.actions}
          onClose={() => setToast(null)}
        />
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-[#0b0b0b] p-6 text-white shadow-2xl">
            <div className="text-lg font-semibold">Apagar sessão</div>
            <p className="mt-2 text-sm text-white/70">
              Tem a certeza que queres apagar a sessão{" "}
              <span className="font-semibold text-white">{actionModal.name || actionModal.id}</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-full border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10"
                onClick={() => setActionModal(null)}
                disabled={deletingId === actionModal.id}
              >
                Voltar
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90 disabled:opacity-50"
                onClick={() => {
                  if (!actionModal) return;
                  deleteSession(actionModal.id);
                  setActionModal(null);
                }}
                disabled={deletingId === actionModal.id}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Admin</p>
        <h1 className="text-4xl font-semibold text-white tracking-tight">
          Sessões privadas
        </h1>
        <p className="text-sm text-white/70">
          Lista de sessões privadas. Clica numa sessão para ver as fotos.
        </p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={loadSessions}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "A carregar…" : "Recarregar"}
        </button>
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPageIndex(0);
            }}
            placeholder="Filtrar por nome, código, estado…"
            className="w-full rounded-2xl border border-white/15 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className={`${cardClass} p-10 text-center text-sm text-white/50`}>
          A carregar sessões…
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${cardClass} p-10 text-center`}>
          <Lock size={32} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm text-white/50">
            {items.length === 0
              ? "Ainda não existem sessões privadas."
              : "Nenhuma sessão corresponde ao filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pageItems.map((item) => {
            const ps = statusLabel(item.paymentStatus);
            return (
              <div
                key={item.id}
                onClick={() => router.push(`/${locale}/admin/sessions/${item.id}`)}
                className={`${cardClass} cursor-pointer p-5 transition hover:border-white/20 hover:bg-white/[0.07]`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Left — name + code */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-white">
                        {item.name || "Sessão sem nome"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tracking-wider text-white/40">
                        {item.id}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => copySessionCode(e, item.id)}
                        className="flex h-5 w-5 items-center justify-center rounded text-white/30 transition hover:bg-white/10 hover:text-white/60"
                        title="Copiar código"
                      >
                        {copiedId === item.id ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>

                  {/* Meta pills */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-white/50">
                      <ImageIcon size={12} />
                      <span className="font-medium text-white/70">{item.photoCount}</span>
                      fotos
                    </div>
                    <div className="flex items-center gap-1.5 text-white/50">
                      <Calendar size={12} />
                      <span className="text-white/70">{formatDate(item.createdAt)}</span>
                    </div>
                    {item.paymentStatus && (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${ps.cls}`}>
                        <CreditCard size={10} />
                        {ps.text}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionModal({ id: item.id, type: "delete", name: item.name });
                      }}
                      disabled={deletingId === item.id}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-white/30 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      title="Apagar sessão"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-white/40">
                {filtered.length} sessões · Página {currentPage + 1} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => goPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 transition hover:bg-white/90 disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
