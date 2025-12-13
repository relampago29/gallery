"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";

type PendingOrder = {
  id: string;
  sessionId: string;
  sessionName: string;
  selectedCount: number;
  createdAt: number | null;
};

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken();
}

export default function PendingPaymentsPage() {
  const [items, setItems] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

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
      setError(err?.message || "Não foi possível carregar os pagamentos pendentes.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmPayment(orderId: string) {
    try {
      setConfirming(orderId);
      const token = await getIdToken();
      const res = await fetch(`/api/session-orders/${orderId}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Falha ao confirmar.");
      }
      setItems((prev) => prev.filter((item) => item.id !== orderId));
    } catch (err: any) {
      alert(err?.message || "Não foi possível confirmar o pagamento.");
    } finally {
      setConfirming(null);
    }
  }

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Pagamentos</p>
        <h1 className="text-3xl font-semibold text-white">Pagamentos pendentes</h1>
        <p className="text-sm text-white/70">Confirma os pedidos quando recebes o pagamento via MBWay.</p>
        <div>
          <button
            type="button"
            onClick={loadPending}
            className="rounded-full border border-white/20 px-4 py-1 text-sm text-white transition hover:bg-white/10"
          >
            Recarregar
          </button>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">A carregar…</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          Não há pagamentos pendentes neste momento.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">{item.sessionId}</p>
                  <div className="text-lg font-semibold text-white">{item.sessionName}</div>
                  <p className="text-sm text-white/60">{item.selectedCount} foto(s) · {item.createdAt ? new Date(item.createdAt).toLocaleString("pt-PT") : "sem data"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => confirmPayment(item.id)}
                    disabled={confirming === item.id}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
                  >
                    {confirming === item.id ? "A confirmar…" : "Pagamento confirmado"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
