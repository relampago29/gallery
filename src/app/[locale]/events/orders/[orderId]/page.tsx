"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import NavBar from "@/components/shared/navbar/navbar";

type OrderPayload = {
  id: string;
  status: "pending" | "paid" | "fulfilled" | string;
  itemCount: number;
  totalPrice: number;
  eventNames: Record<string, string>;
  createdAt: number | null;
  paymentConfirmedAt: number | null;
};

export default function EventOrderPaymentPage() {
  const locale = useLocale();
  const t = useTranslations("eventOrderPayment");
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentPhone, setPaymentPhone] = useState<string>("---");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/payment-phone", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.phone === "string" && data.phone.trim()) {
          setPaymentPhone(data.phone.trim());
        }
      } catch {
        // fallback
      }
    })();
  }, []);

  const orderId = params?.orderId || "";

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/event-orders/${orderId}?token=${token}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || t("checkFailed"));
      }
      const data = (await res.json()) as OrderPayload;
      setOrder(data);
      setStatusError(null);
    } catch (err: any) {
      setStatusError(err?.message || t("paymentCheckFailed"));
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
      router.replace(
        `/${locale}/events/orders/${orderId}/download?token=${token}`
      );
      return;
    }
    if (order.status === "rejected" || order.status === "cancelled") {
      router.replace(`/${locale}/events`);
    }
  }, [order, router, locale, orderId, token]);

  const statusLabel = useMemo(() => {
    if (!order) return t("statusValidating");
    switch (order.status) {
      case "paid":
      case "fulfilled":
        return t("statusConfirmed");
      case "rejected":
        return t("statusRejected");
      case "cancelled":
        return t("statusCancelled");
      default:
        return t("statusPending");
    }
  }, [order, t]);

  const eventNamesList = useMemo(() => {
    if (!order?.eventNames) return "";
    return Object.values(order.eventNames).join(", ");
  }, [order]);

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            {t("badge")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {t("title")}
          </h1>
          <p className="text-sm text-white/70">{t("subtitle")}</p>
        </header>

        {!token ? (
          <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-center text-sm text-red-100">
            {t("missingToken")}
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                {t("statusLabel")}
              </p>
              <div className="text-lg font-semibold text-white">
                {statusLabel}
              </div>
              {statusError ? (
                <p className="text-sm text-red-300">{statusError}</p>
              ) : null}
              {loading ? (
                <p className="text-sm text-white/60">{t("confirmingData")}</p>
              ) : null}
            </div>

            {order ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80 space-y-2">
                <div className="flex justify-between">
                  <span>{t("events")}</span>
                  <strong className="text-right max-w-[60%] truncate">
                    {eventNamesList}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>{t("photos")}</span>
                  <strong>{order.itemCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t("total")}</span>
                  <strong className="text-white">
                    {order.totalPrice.toFixed(2)}€
                  </strong>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/20 bg-black/20 p-4 text-white">
              <p className="text-sm text-white/60">{t("mbwayLabel")}</p>
              <div className="text-3xl font-semibold tracking-wide">
                {paymentPhone}
              </div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                {t("mbwayRequired")}
              </p>
            </div>

            <div className="text-xs text-white/60">{t("waitingMessage")}</div>
          </div>
        </div>

        <div className="text-center text-xs text-white/50">
          {t("orderId")}{" "}
          <span className="font-mono text-white/80">{orderId}</span>
        </div>
      </main>
    </div>
  );
}
