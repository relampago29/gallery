"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import NavBar from "@/components/shared/navbar/navbar";
import {
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

type OrderPayload = {
  id: string;
  status: "pending" | "paid" | "fulfilled" | "rejected" | "cancelled" | string;
  sessionId: string;
  sessionName: string;
  selectedCount: number;
  createdAt: number | null;
  paymentConfirmedAt: number | null;
};

function OrderContent() {
  const locale = useLocale();
  const t = useTranslations("sessionOrderPayment");
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = params?.orderId || "";
  const token = searchParams.get("token") || "";

  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentPhone, setPaymentPhone] = useState<string>("---");
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Fetch payment phone (only needed for pending state, but fetched early)
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
        // fallback stays as "---"
      }
    })();
  }, []);

  const fetchStatus = async () => {
    if (!token || !orderId) return;
    try {
      const res = await fetch(`/api/session-orders/${orderId}?token=${token}`, {
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

  // Initial fetch + poll every 6s while pending
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchStatus();
    const interval = setInterval(() => {
      // Only keep polling while order is pending
      if (order && order.status !== "pending") return;
      fetchStatus();
    }, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orderId]);

  const isPending = !loading && order?.status === "pending";
  const isPaid =
    !loading && (order?.status === "paid" || order?.status === "fulfilled");
  const isRejected =
    !loading && (order?.status === "rejected" || order?.status === "cancelled");

  const downloadUrl = `/api/session-orders/${orderId}/download?token=${encodeURIComponent(token)}`;

  // Title + subtitle change based on order state
  const { title, subtitle } = useMemo(() => {
    if (isPaid) {
      return { title: t("downloadTitle"), subtitle: t("downloadSubtitle") };
    }
    if (isRejected) {
      return { title: t("rejectedTitle"), subtitle: t("rejectedSubtitle") };
    }
    return { title: t("title"), subtitle: t("subtitle") };
  }, [isPaid, isRejected, t]);

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            {t("badge")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="text-sm text-white/70">{subtitle}</p>
        </header>

        {/* Missing token */}
        {!token && (
          <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-center text-sm text-red-100">
            {t("missingToken")}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            <Loader2
              size={24}
              className="mx-auto mb-3 animate-spin text-white/40"
            />
            <p className="text-sm text-white/50">{t("confirmingData")}</p>
          </div>
        )}

        {/* ── PENDING STATE: MBWay payment instructions ── */}
        {isPending && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            <div className="space-y-4">
              {/* Order details */}
              {order && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                  <div className="flex justify-between">
                    <span>{t("session")}</span>
                    <strong>{order.sessionName || order.sessionId}</strong>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span>{t("photosSelected")}</span>
                    <strong>{order.selectedCount}</strong>
                  </div>
                </div>
              )}

              {/* MBWay phone */}
              <div className="rounded-2xl border border-white/20 bg-black/20 p-4 text-white">
                <p className="text-sm text-white/60">{t("mbwayLabel")}</p>
                <div className="text-3xl font-semibold tracking-wide">
                  {paymentPhone}
                </div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                  {t("mbwayRequired")}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
                <Clock size={18} className="shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-200">
                    {t("statusPending")}
                  </p>
                  <p className="text-xs text-white/60">{t("waitingMessage")}</p>
                </div>
              </div>

              {statusError && (
                <p className="text-sm text-red-300">{statusError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── PAID / FULFILLED STATE: Download ── */}
        {isPaid && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            <div className="space-y-5 text-center">
              {order && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80 text-left">
                  <div className="flex justify-between">
                    <span>{t("session")}</span>
                    <strong>{order.sessionName || order.sessionId}</strong>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span>{t("photosSelected")}</span>
                    <strong>{order.selectedCount}</strong>
                  </div>
                </div>
              )}

              {!downloadStarted ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                  <p className="text-sm text-emerald-200">
                    {t("statusConfirmed")}
                  </p>
                  <a
                    href={downloadUrl}
                    onClick={() => setDownloadStarted(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 active:scale-95"
                  >
                    <Download size={16} />
                    {t("download")}
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-2">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                  <p className="text-lg font-semibold text-emerald-300">
                    {t("downloadStarted")}
                  </p>
                  <p className="text-sm text-white/60">
                    {t("preparationDone")}
                  </p>
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <a
                      href={downloadUrl}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 active:scale-95"
                    >
                      <Download size={14} />
                      {t("downloadAgain")}
                    </a>
                    <Link
                      href="/dashboard?tab=sessions"
                      className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      {t("backToDashboard")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REJECTED / CANCELLED STATE ── */}
        {isRejected && order && (
          <div className="rounded-3xl border border-red-400/20 bg-red-500/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            <div className="space-y-4 text-center">
              <AlertCircle size={32} className="mx-auto text-red-400" />
              <div>
                <p className="text-base font-semibold text-red-200">
                  {order.status === "cancelled"
                    ? t("statusCancelled")
                    : t("statusRejected")}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {t("rejectedHint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push(`/${locale}/sessions/${order.sessionId}`)
                }
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
              >
                <ArrowLeft size={14} />
                {t("backToSession")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#030303] flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-white/40" />
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}
