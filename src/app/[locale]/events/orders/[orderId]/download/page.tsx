"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import NavBar from "@/components/shared/navbar/navbar";
import { Link } from "@/i18n/navigation";
import { Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function EventOrderDownloadPage() {
  const locale = useLocale();
  const t = useTranslations("eventOrderDownload");
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId || "";
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") || ""
      : "";

  const [loading, setLoading] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Validate order on mount
  useEffect(() => {
    if (!orderId || !token) {
      setError(t("downloadFailed"));
      setLoading(false);
      return;
    }

    let aborted = false;
    fetch(`/api/event-orders/${orderId}?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((payload) => {
        if (aborted) return;
        const status = payload?.status;
        setCanDownload(status === "paid" || status === "fulfilled");
        setItemCount(
          typeof payload?.itemCount === "number" ? payload.itemCount : null,
        );
        if (status !== "paid" && status !== "fulfilled") {
          setError(t("downloadFailed"));
        }
        setLoading(false);
      })
      .catch(() => {
        if (aborted) return;
        setError(t("downloadFailed"));
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [orderId, token, t]);

  const downloadUrl = `/api/event-orders/${orderId}/download?token=${encodeURIComponent(
    token,
  )}`;

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

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="space-y-5 text-center">
            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={24} className="animate-spin text-white/60" />
                <p className="text-sm text-white/70">{t("subtitle")}</p>
              </div>
            )}

            {/* Error / not paid */}
            {!loading && error && !canDownload && (
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle size={28} className="text-amber-400" />
                <p className="text-sm text-amber-200">{error}</p>
              </div>
            )}

            {/* Ready — download not yet started */}
            {!loading && canDownload && !downloadStarted && (
              <div className="flex flex-col items-center gap-4 py-4">
                {itemCount && (
                  <p className="text-sm text-white/70">
                    {itemCount} {itemCount === 1 ? "foto" : "fotos"}
                  </p>
                )}
                <a
                  href={downloadUrl}
                  onClick={() => setDownloadStarted(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 active:scale-95"
                >
                  <Download size={16} />
                  {t("startDownload")}
                </a>
              </div>
            )}

            {/* Download started */}
            {!loading && canDownload && downloadStarted && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 size={28} className="text-emerald-400" />
                <p className="text-lg font-semibold text-emerald-300">
                  {t("downloadComplete")}
                </p>
                <p className="text-sm text-white/60">{t("checkDownloads")}</p>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 active:scale-95"
                  >
                    <Download size={14} />
                    {t("tryAgain")}
                  </a>
                  <Link
                    href="/dashboard?tab=history"
                    locale={locale}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
                  >
                    {t("viewHistory")}
                  </Link>
                </div>
              </div>
            )}
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
