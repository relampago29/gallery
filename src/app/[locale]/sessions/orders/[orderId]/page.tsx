"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import NavBar from "@/components/shared/navbar/navbar";

type OrderPayload = {
  id: string;
  status: "pending" | "paid" | "fulfilled" | string;
  sessionId: string;
  sessionName: string;
  selectedCount: number;
  createdAt: number | null;
  paymentConfirmedAt: number | null;
};

export default function OrderPaymentPage() {
  const locale = useLocale();
  const params = useParams<{ orderId: string; locale: string }>();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentPhone, setPaymentPhone] = useState<string>(process.env.NEXT_PUBLIC_PAYMENT_PHONE?.trim() || "913 000 000");

  useEffect(() => {
    setOrderId(params?.orderId || null);
    const qsToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "";
    setToken(qsToken);
  }, [params?.orderId]);

  useEffect(() => {
    const loadPhone = async () => {
      try {
        const res = await fetch("/api/settings/payment-phone");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (typeof data?.phone === "string" && data.phone.trim().length) {
          setPaymentPhone(data.phone.trim());
        }
      } catch {
        // silent fallback
      }
    };
    loadPhone();
  }, []);

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/session-orders/${orderId}?token=${token}`, { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Não conseguimos verificar o pagamento.");
      }
      const data = (await res.json()) as OrderPayload;
      setOrder(data);
      setStatusError(null);
    } catch (err: any) {
      setStatusError(err?.message || "Falha ao verificar o pagamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orderId]);

  useEffect(() => {
    if (!order) return;
    if (order.status === "paid" || order.status === "fulfilled") {
      router.replace(`/${locale}/sessions/orders/${orderId}/download?token=${token}`);
      return;
    }
    if (order.status === "rejected" || order.status === "cancelled") {
      const qs = new URLSearchParams();
      qs.set("sessionId", order.sessionId);
      router.replace(`/${locale}/sessions?${qs.toString()}`);
    }
  }, [order, router, locale, orderId, token]);

  const statusLabel = useMemo(() => {
    if (!order) return "a validar";
    switch (order.status) {
      case "paid":
      case "fulfilled":
        return "Pagamento confirmado";
      case "rejected":
        return "Pagamento rejeitado";
      case "cancelled":
        return "Pagamento cancelado";
      default:
        return "A aguardar confirmação";
    }
  }, [order]);

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Pagamento</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Confirmação do teu pedido</h1>
          <p className="text-sm text-white/70">
            Assim que o pagamento for confirmado vamos avançar automaticamente para o download das fotos escolhidas.
          </p>
        </header>

        {!token ? (
          <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-center text-sm text-red-100">
            Falta o token de acesso. Reabre o link enviado após a seleção das fotos.
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Estado</p>
              <div className="text-lg font-semibold text-white">{statusLabel}</div>
              {statusError ? <p className="text-sm text-red-300">{statusError}</p> : null}
              {loading ? <p className="text-sm text-white/60">A confirmar dados…</p> : null}
            </div>
            {order ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                <div className="flex justify-between">
                  <span>Sessão</span>
                  <strong>{order.sessionName || order.sessionId}</strong>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Fotos seleccionadas</span>
                  <strong>{order.selectedCount}</strong>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/20 bg-black/20 p-4 text-white">
              <p className="text-sm text-white/60">Efetua o pagamento MBWay para</p>
              <div className="text-3xl font-semibold tracking-wide">{paymentPhone}</div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">necessário para avançar</p>
            </div>

            <div className="text-xs text-white/60">
              Mal confirmarmos o pagamento vais receber automaticamente o download das fotos. Mantém esta página aberta.
            </div>
          </div>
        </div>

        {orderId ? (
          <div className="text-center text-xs text-white/50">
            ID do pedido: <span className="font-mono text-white/80">{orderId}</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
