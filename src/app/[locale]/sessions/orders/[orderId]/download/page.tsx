"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import NavBar from "@/components/shared/navbar/navbar";
import { Link } from "@/i18n/navigation";
import { Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function OrderDownloadPage() {
  const locale = useLocale();
  const t = useTranslations("sessionOrderDownload");
  const params = useParams<{ orderId: string; locale: string }>();
  const orderId = params?.orderId || "";
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  const [loading, setLoading] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Validate order on mount
  useEffect(() => {
    if (!orderId || !token) {
      setError(t("tokenMissing"));
      setLoading(false);
      return;
    }

    let aborted = false;
    fetch(`/api/session-orders/${orderId}?token=${encodeURIComponent(token)}`, {
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
        setSelectedCount(
          typeof payload?.selectedCount === "number"
            ? payload.selectedCount
            : null
        );
        if (status !== "paid" && status !== "fulfilled") {
          setError(t("tokenMissing"));
        }
        setLoading(false);
      })
      .catch(() => {
        if (aborted) return;
        setError(t("tokenMissing"));
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [orderId, token, t]);

  const downloadUrl = `/api/session-orders/${orderId}/download?token=${encodeURIComponent(
    token
  )}`;

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-16 pt-10 text-center sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Download
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {t("fileReady")}
        </h1>
        <p className="text-sm text-white/70">{t("preparingFile")}</p>

        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="space-y-5 text-center">
            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={24} className="animate-spin text-white/60" />
                <p className="text-sm text-white/70">{t("preparingFile")}</p>
              </div>
            )}

            {/* Error / not paid */}
            {!loading && error && !canDownload && (
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle size={28} className="text-amber-400" />
                <p className="text-sm text-amber-200">{error}</p>
              </div>
            )}

            {/* Token missing */}
            {!token && !loading && (
              <p className="text-sm text-red-400">{t("tokenMissing")}</p>
            )}

            {/* Ready — download not yet started */}
            {!loading && canDownload && !downloadStarted && (
              <div className="flex flex-col items-center gap-4 py-4">
                {selectedCount && (
                  <p className="text-sm text-white/70">
                    {selectedCount} {selectedCount === 1 ? "foto" : "fotos"}
                  </p>
                )}
                <a
                  href={downloadUrl}
                  onClick={() => setDownloadStarted(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 active:scale-95"
                >
                  <Download size={16} />
                  {t("download")}
                </a>
              </div>
            )}

            {/* Download started */}
            {!loading && canDownload && downloadStarted && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 size={28} className="text-emerald-400" />
                <p className="text-lg font-semibold text-emerald-300">
                  {t("fileReady")}
                </p>
                <p className="text-sm text-white/60">
                  {t("preparationDone", { duration: "" })}
                </p>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 active:scale-95"
                  >
                    <Download size={14} />
                    {t("download")}
                  </a>
                  <Link
                    href="/"
                    locale={locale}
                    className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    {t("backToHome")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-white/60">
          {t("orderLabel", { id: orderId })}
        </div>
      </main>
    </div>
  );
}
